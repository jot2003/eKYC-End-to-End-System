"""
Generate synthetic CCCD images for testing DocuMind eKYC pipeline.
Uses Pillow to render Vietnamese ID card layout with random data.
"""
import json
import os
import random
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

LAST_NAMES = [
    "NGUYỄN", "TRẦN", "LÊ", "PHẠM", "HOÀNG", "HUỲNH", "PHAN",
    "VŨ", "VÕ", "ĐẶNG", "BÙI", "ĐỖ", "HỒ", "NGUYỄN", "TRƯƠNG",
]
MIDDLE_NAMES = [
    "VĂN", "THỊ", "ĐÌNH", "MINH", "QUỐC", "NGỌC", "XUÂN",
    "THANH", "PHƯƠNG", "ANH", "HOÀNG", "HỮU", "BÍCH", "KIM",
]
FIRST_NAMES = [
    "AN", "BÌNH", "CƯỜNG", "DŨNG", "HÀ", "HẢI", "HIẾU",
    "HÙNG", "HƯƠNG", "KHOA", "LINH", "LONG", "MAI", "NAM",
    "NGÂN", "PHÚC", "QUANG", "SƠN", "THẮNG", "THẢO", "TRUNG",
    "TUẤN", "VĂN", "VIỆT", "XUÂN", "YẾN", "THANH", "NHẬT",
]
PROVINCES = [
    "Hà Nội", "Hồ Chí Minh", "Đà Nẵng", "Hải Phòng", "Cần Thơ",
    "Bắc Ninh", "Nghệ An", "Thanh Hóa", "Thái Bình", "Nam Định",
    "Hưng Yên", "Hải Dương", "Bình Dương", "Đồng Nai", "Khánh Hòa",
    "Thừa Thiên Huế", "Quảng Nam", "Quảng Ninh", "Lâm Đồng", "Bắc Giang",
]
DISTRICTS = [
    "Quận 1", "Quận Ba Đình", "Quận Hoàn Kiếm", "Quận Đống Đa",
    "Huyện Thanh Trì", "Thị xã Sơn Tây", "Quận Hải Châu",
    "Quận Cầu Giấy", "Quận Hai Bà Trưng", "Quận Long Biên",
]
WARDS = [
    "Phường 1", "Phường Trung Hòa", "Phường Nghĩa Đô",
    "Phường Thành Công", "Xã Đại Mỗ", "Phường Yên Hòa",
    "TT. Gia Lâm", "Phường Cát Linh", "Phường Kim Liên",
]
STREETS = [
    "Đường Láng", "Phố Huế", "Đường Giải Phóng", "Đường Nguyễn Trãi",
    "Đường Lê Duẩn", "Phố Bà Triệu", "Đường Trần Phú", "Phố Tôn Đức Thắng",
]


def random_cccd_number() -> str:
    province_code = random.choice(["001", "024", "048", "031", "092", "027", "038"])
    gender_century = random.choice(["0", "1", "2", "3"])
    birth_year = f"{random.randint(70, 99):02d}"
    seq = f"{random.randint(100000, 999999)}"
    return province_code + gender_century + birth_year + seq


def random_date(start_year: int = 1970, end_year: int = 2005) -> str:
    day = random.randint(1, 28)
    month = random.randint(1, 12)
    year = random.randint(start_year, end_year)
    return f"{day:02d}/{month:02d}/{year}"


def random_name() -> str:
    return f"{random.choice(LAST_NAMES)} {random.choice(MIDDLE_NAMES)} {random.choice(FIRST_NAMES)}"


def random_address() -> str:
    num = random.randint(1, 200)
    street = random.choice(STREETS)
    ward = random.choice(WARDS)
    district = random.choice(DISTRICTS)
    province = random.choice(PROVINCES)
    return f"Số {num}, {street}, {ward}, {district}, {province}"


def generate_cccd_data() -> dict:
    dob = random_date(1970, 2005)
    year = int(dob.split("/")[2])
    exp_date = f"{dob.split('/')[0]}/{dob.split('/')[1]}/{year + 50}"

    return {
        "so_cccd": random_cccd_number(),
        "ho_ten": random_name(),
        "ngay_sinh": dob,
        "gioi_tinh": random.choice(["Nam", "Nữ"]),
        "quoc_tich": "Việt Nam",
        "que_quan": f"{random.choice(DISTRICTS)}, {random.choice(PROVINCES)}",
        "noi_thuong_tru": random_address(),
        "ngay_het_han": exp_date,
    }


def render_cccd_image(data: dict, width: int = 856, height: int = 540) -> Image.Image:
    img = Image.new("RGB", (width, height), "#f5f5f0")
    draw = ImageDraw.Draw(img)

    draw.rectangle([(0, 0), (width - 1, height - 1)], outline="#ccc", width=2)
    draw.rectangle([(10, 10), (width - 11, height - 11)], outline="#b22222", width=3)

    try:
        font_title = ImageFont.truetype("arial.ttf", 16)
        font_label = ImageFont.truetype("arial.ttf", 13)
        font_value = ImageFont.truetype("arial.ttf", 15)
        font_number = ImageFont.truetype("arial.ttf", 22)
    except OSError:
        font_title = ImageFont.load_default()
        font_label = font_title
        font_value = font_title
        font_number = font_title

    y = 30
    draw.text((width // 2, y), "CONG HOA XA HOI CHU NGHIA VIET NAM", fill="#b22222",
              font=font_title, anchor="mt")
    y += 22
    draw.text((width // 2, y), "Doc lap - Tu do - Hanh phuc", fill="#333",
              font=font_label, anchor="mt")
    y += 30
    draw.text((width // 2, y), "CAN CUOC CONG DAN", fill="#b22222",
              font=font_number, anchor="mt")
    y += 35

    photo_x, photo_y = 40, y
    photo_w, photo_h = 160, 200
    draw.rectangle([(photo_x, photo_y), (photo_x + photo_w, photo_y + photo_h)],
                   fill="#ddd", outline="#999", width=1)
    draw.text((photo_x + photo_w // 2, photo_y + photo_h // 2), "PHOTO",
              fill="#999", font=font_label, anchor="mm")

    text_x = photo_x + photo_w + 30
    row_y = y

    fields = [
        ("So / No:", data["so_cccd"]),
        ("Ho va ten / Full name:", data["ho_ten"]),
        ("Ngay sinh / Date of birth:", data["ngay_sinh"]),
        ("Gioi tinh / Sex:", data["gioi_tinh"]),
        ("Quoc tich / Nationality:", data["quoc_tich"]),
        ("Que quan / Place of origin:", data["que_quan"]),
    ]

    for label, value in fields:
        draw.text((text_x, row_y), label, fill="#666", font=font_label)
        row_y += 18
        draw.text((text_x, row_y), value, fill="#111", font=font_value)
        row_y += 28

    residence_y = photo_y + photo_h + 15
    draw.text((40, residence_y), "Noi thuong tru / Place of residence:", fill="#666", font=font_label)
    residence_y += 18
    addr = data["noi_thuong_tru"]
    if len(addr) > 55:
        draw.text((40, residence_y), addr[:55], fill="#111", font=font_value)
        residence_y += 20
        draw.text((40, residence_y), addr[55:], fill="#111", font=font_value)
    else:
        draw.text((40, residence_y), addr, fill="#111", font=font_value)
    residence_y += 25

    draw.text((40, residence_y), "Co gia tri den / Date of expiry:", fill="#666", font=font_label)
    residence_y += 18
    draw.text((40, residence_y), data["ngay_het_han"], fill="#111", font=font_value)

    return img


def main():
    output_dir = Path("data/samples")
    gt_dir = Path("data/ground_truth")
    output_dir.mkdir(parents=True, exist_ok=True)
    gt_dir.mkdir(parents=True, exist_ok=True)

    n = int(sys.argv[1]) if len(sys.argv) > 1 else 5

    print(f"Generating {n} synthetic CCCD images...")

    all_gt = []
    for i in range(n):
        data = generate_cccd_data()
        img = render_cccd_image(data)

        img_path = output_dir / f"cccd_{i + 1:03d}.png"
        img.save(img_path, quality=95)

        gt_entry = {"image": str(img_path), "fields": data}
        all_gt.append(gt_entry)
        print(f"  [{i + 1}/{n}] {img_path} -> {data['ho_ten']}")

    gt_path = gt_dir / "cccd_ground_truth.json"
    with open(gt_path, "w", encoding="utf-8") as f:
        json.dump(all_gt, f, ensure_ascii=False, indent=2)

    print(f"\nDone! Images: {output_dir}, Ground truth: {gt_path}")


if __name__ == "__main__":
    main()
