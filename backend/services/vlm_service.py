import json
import logging
import re

import cv2
import numpy as np
from openai import AzureOpenAI

from backend.utils.config import settings
from backend.utils.image_utils import encode_image_base64

logger = logging.getLogger(__name__)

CCCD_FRONT_PROMPT = """Bạn là hệ thống trích xuất thông tin từ thẻ Căn cước / Căn cước công dân (CCCD) Việt Nam.
Lưu ý: Có 2 loại thẻ:
- Thẻ "CĂN CƯỚC" (format mới 2024): mặt trước có Số, Họ và tên, Ngày sinh, Giới tính, Quốc tịch.
- Thẻ "CĂN CƯỚC CÔNG DÂN" (format cũ): mặt trước có thêm Quê quán, Nơi thường trú, Có giá trị đến.

Hãy nhìn ảnh MẶT TRƯỚC và trích xuất tất cả thông tin có thể đọc được.
Trả về ĐÚNG format JSON sau:
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
- Nếu trường nào KHÔNG CÓ trên thẻ hoặc không đọc được, dùng null.
- Ngày tháng ghi theo format DD/MM/YYYY.
- CHỈ trả về JSON, KHÔNG giải thích."""

CCCD_BACK_PROMPT = """Bạn là hệ thống trích xuất thông tin từ mặt sau thẻ Căn cước / Căn cước công dân Việt Nam.
Lưu ý: Có 2 loại thẻ:
- Thẻ "CĂN CƯỚC" (format mới 2024): mặt sau có Nơi cư trú, Nơi đăng ký khai sinh, Ngày tháng năm cấp, Ngày tháng năm hết hạn, Nơi cấp, và có thể có MRZ + QR code.
- Thẻ "CĂN CƯỚC CÔNG DÂN" (format cũ): mặt sau có Đặc điểm nhận dạng, Ngày tháng năm cấp, và có thể có MRZ.

Hãy nhìn ảnh MẶT SAU và trích xuất tất cả thông tin có thể đọc được.
Trả về ĐÚNG format JSON sau:
{
  "noi_cu_tru": "",
  "noi_dang_ky_khai_sinh": "",
  "ngay_cap": "",
  "ngay_het_han": "",
  "noi_cap": "",
  "dac_diem_nhan_dang": "",
  "mrz_line_1": "",
  "mrz_line_2": "",
  "mrz_line_3": ""
}
- Nếu trường nào KHÔNG CÓ trên thẻ hoặc không đọc được, dùng null.
- Ngày tháng ghi theo format DD/MM/YYYY.
- CHỈ trả về JSON, KHÔNG giải thích."""

CCCD_FRONT_EMPTY: dict[str, str | None] = {
    "so_cccd": None, "ho_ten": None, "ngay_sinh": None,
    "gioi_tinh": None, "quoc_tich": None, "que_quan": None,
    "noi_thuong_tru": None, "ngay_het_han": None,
}

CCCD_BACK_EMPTY: dict[str, str | None] = {
    "noi_cu_tru": None, "noi_dang_ky_khai_sinh": None,
    "ngay_cap": None, "ngay_het_han": None, "noi_cap": None,
    "dac_diem_nhan_dang": None,
    "mrz_line_1": None, "mrz_line_2": None, "mrz_line_3": None,
}

BACK_FIELD_MAP: dict[str, str] = {
    "noi_cu_tru": "noi_thuong_tru",
    "noi_dang_ky_khai_sinh": "que_quan",
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
        raw = self._extract_with_prompt(image, CCCD_BACK_PROMPT, CCCD_BACK_EMPTY)
        return self._map_back_fields(raw)

    @staticmethod
    def _map_back_fields(raw: dict[str, str | None]) -> dict[str, str | None]:
        mapped: dict[str, str | None] = {}
        for k, v in raw.items():
            target = BACK_FIELD_MAP.get(k, k)
            if target in mapped and mapped[target]:
                continue
            mapped[target] = v
        return mapped

    def _extract_with_prompt(
        self, image: np.ndarray, prompt: str, empty_result: dict
    ) -> dict[str, str | None]:
        enhanced = self._enhance_image(image)
        base64_img = encode_image_base64(enhanced)

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
                max_completion_tokens=800,
            )

            raw_text = response.choices[0].message.content or ""
            logger.info("VLM raw response length: %d chars", len(raw_text))
            logger.debug("VLM raw: %s", raw_text[:500])
            return self._parse_json(raw_text, empty_result)

        except Exception as e:
            logger.error("VLM extraction failed: %s", e)
            return dict(empty_result)

    @staticmethod
    def _enhance_image(image: np.ndarray) -> np.ndarray:
        h, w = image.shape[:2]
        if max(h, w) < 800:
            scale = 800 / max(h, w)
            image = cv2.resize(image, (int(w * scale), int(h * scale)),
                               interpolation=cv2.INTER_CUBIC)

        lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
        l_ch, a_ch, b_ch = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        l_ch = clahe.apply(l_ch)
        enhanced = cv2.merge([l_ch, a_ch, b_ch])
        return cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)

    @staticmethod
    def _parse_json(raw: str, fallback: dict) -> dict[str, str | None]:
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
            return dict(fallback)
