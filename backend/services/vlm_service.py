import json
import logging
import re

import cv2
import numpy as np
from openai import AzureOpenAI

from backend.utils.config import settings
from backend.utils.image_utils import encode_image_base64

logger = logging.getLogger(__name__)

CCCD_FRONT_PROMPT = """Bạn là hệ thống đọc Căn cước công dân (CCCD) Việt Nam.
Hãy nhìn ảnh CCCD MẶT TRƯỚC này và trích xuất thông tin.
Trả về ĐÚNG format JSON sau, KHÔNG giải thích thêm:
{
  "so_cccd": "",
  "ho_ten": "",
  "ngay_sinh": "",
  "gioi_tinh": "",
  "quoc_tich": "",
  "que_quan": "",
  "noi_thuong_tru": "",
  "ngay_het_han": ""
}
Nếu không đọc được trường nào, dùng null.
CHỈ trả về JSON, không có markdown hay giải thích."""

CCCD_BACK_PROMPT = """Bạn là hệ thống đọc Căn cước công dân (CCCD) Việt Nam.
Hãy nhìn ảnh CCCD MẶT SAU này và trích xuất thông tin.
Mặt sau chứa: đặc điểm nhận dạng, ngày cấp, và có thể có MRZ (Machine Readable Zone) gồm 3 dòng ký tự.
Trả về ĐÚNG format JSON sau, KHÔNG giải thích thêm:
{
  "ngay_cap": "",
  "dac_diem_nhan_dang": "",
  "mrz_line_1": "",
  "mrz_line_2": "",
  "mrz_line_3": ""
}
Nếu không đọc được trường nào, dùng null.
CHỈ trả về JSON, không có markdown hay giải thích."""

CCCD_FRONT_EMPTY = {
    "so_cccd": None, "ho_ten": None, "ngay_sinh": None,
    "gioi_tinh": None, "quoc_tich": None, "que_quan": None,
    "noi_thuong_tru": None, "ngay_het_han": None,
}

CCCD_BACK_EMPTY = {
    "ngay_cap": None, "dac_diem_nhan_dang": None,
    "mrz_line_1": None, "mrz_line_2": None, "mrz_line_3": None,
}


class VLMService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        logger.info("Initializing VLM service (Azure OpenAI)...")
        self._client = AzureOpenAI(
            api_key=settings.azure_openai_key,
            api_version="2024-12-01-preview",
            azure_endpoint=settings.azure_openai_endpoint,
        )
        self._deployment = settings.azure_openai_deployment
        self._initialized = True
        logger.info("VLM service ready (deployment=%s)", self._deployment)

    def extract_cccd(self, image: np.ndarray) -> dict[str, str | None]:
        return self._extract_with_prompt(image, CCCD_FRONT_PROMPT, CCCD_FRONT_EMPTY)

    def extract_cccd_back(self, image: np.ndarray) -> dict[str, str | None]:
        return self._extract_with_prompt(image, CCCD_BACK_PROMPT, CCCD_BACK_EMPTY)

    def _extract_with_prompt(
        self, image: np.ndarray, prompt: str, empty_result: dict
    ) -> dict[str, str | None]:
        base64_img = encode_image_base64(image)

        try:
            response = self._client.chat.completions.create(
                model=self._deployment,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64_img}",
                                    "detail": "high",
                                },
                            },
                        ],
                    }
                ],
                max_completion_tokens=500,
            )

            raw_text = response.choices[0].message.content or ""
            logger.info("VLM raw response length: %d chars", len(raw_text))
            return self._parse_json(raw_text)

        except Exception as e:
            logger.error("VLM extraction failed: %s", e)
            return dict(empty_result)

    def _parse_json(self, raw: str) -> dict[str, str | None]:
        cleaned = raw.strip()

        json_match = re.search(r"\{[\s\S]*\}", cleaned)
        if json_match:
            try:
                data = json.loads(json_match.group())
                return {k: (v if v else None) for k, v in data.items()}
            except json.JSONDecodeError:
                pass

        try:
            data = json.loads(cleaned)
            return {k: (v if v else None) for k, v in data.items()}
        except json.JSONDecodeError:
            logger.warning("Could not parse VLM response as JSON: %s", cleaned[:200])
            return {
                "so_cccd": None, "ho_ten": None, "ngay_sinh": None,
                "gioi_tinh": None, "quoc_tich": None, "que_quan": None,
                "noi_thuong_tru": None, "ngay_het_han": None,
            }
