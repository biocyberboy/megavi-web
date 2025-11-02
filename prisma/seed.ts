import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Blog posts mẫu
  const blogPosts = [
    {
      slug: "nhip-thi-truong-gia-cam-tuan-01",
      title: "Nhịp thị trường gia cầm tuần 01",
      summary:
        "Ghi nhận tín hiệu phục hồi tại miền Bắc, nguồn cung phía Nam vẫn dồi dào.",
      coverImage: "https://images.unsplash.com/photo-1515669097368-22e68427d265?auto=format&fit=crop&w=1600&q=80",
      bodyMd: `# Điểm nhấn chính

Miền Bắc ghi nhận giá gà trắng tăng nhẹ nhờ nhu cầu mùa lễ hội đang tới gần.

- Nguồn cung giảm nhẹ tại các chợ đầu mối
- Nhu cầu nhà hàng, khách sạn phục hồi sau kỳ nghỉ Tết Dương lịch

> Khuyến nghị: Giữ nhịp bán ra ổn định, theo dõi thêm tín hiệu từ miền Trung.`,
      publishedAt: new Date(Date.UTC(2025, 0, 6)),
    },
    {
      slug: "kenh-tieu-thu-noi-dia-sau-tet",
      title: "Kênh tiêu thụ nội địa sau Tết Dương lịch",
      summary:
        "Các nhà bán lẻ siết tồn kho, ưu tiên gà sơ chế đóng gói để giữ biên lợi nhuận.",
      coverImage: "https://images.unsplash.com/photo-1489447068241-b3490214e879?auto=format&fit=crop&w=1600&q=80",
      bodyMd: `# Bối cảnh bán lẻ

Chuỗi siêu thị lớn ghi nhận mức tiêu thụ giảm 15% so với tuần trước.

## Chiến lược đề xuất

- Rà soát chi phí logistics tuyến Bắc - Nam
- Tăng cường sản phẩm giá trị gia tăng như gà quay sơ chế
- Duy trì tồn kho dưới 5 ngày`,
      publishedAt: new Date(Date.UTC(2025, 0, 10)),
    },
    {
      slug: "ban-do-gia-gia-cam-phia-nam",
      title: "Bản đồ giá gia cầm khu vực phía Nam",
      summary:
        "Giá gà lông màu tại Tây Nam Bộ giữ vững, Đồng Nai điều chỉnh theo nhu cầu lò mổ.",
      coverImage: "https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=1600&q=80",
      bodyMd: `# Tình hình theo tỉnh

- Đồng Nai: 27.500 đ/kg — giảm nhẹ do nhu cầu lò mổ chậm lại
- Long An: 28.300 đ/kg — giữ mức ổn định nhờ kênh phân phối trực tiếp
- Cần Thơ: 29.100 đ/kg — tăng nhờ sức mua từ chợ sỉ

_Đội ngũ MEGAVI tiếp tục quan sát diễn biến giá heo để dự báo nhu cầu thay thế._`,
      publishedAt: new Date(Date.UTC(2025, 0, 14)),
    },
  ];

  for (const post of blogPosts) {
    await prisma.blogPost.upsert({
      where: { slug: post.slug },
      update: {
        title: post.title,
        summary: post.summary,
        coverImage: post.coverImage,
        bodyMd: post.bodyMd,
        publishedAt: post.publishedAt,
      },
      create: {
        slug: post.slug,
        title: post.title,
        summary: post.summary,
        coverImage: post.coverImage,
        bodyMd: post.bodyMd,
        publishedAt: post.publishedAt,
      },
    });
  }

  // Series mẫu theo vùng
  const seriesConfigs = [
    {
      code: "GA_TRANG",
      name: "Gà trắng",
      unit: "VND/kg",
      regions: {
        MIEN_BAC: 28500,
        MIEN_TRUNG: 29500,
        MIEN_NAM: 30500,
      },
    },
    {
      code: "VIT_CONG_NGHIEP",
      name: "Vịt công nghiệp",
      unit: "VND/kg",
      regions: {
        MIEN_BAC: 27000,
        MIEN_TRUNG: 27600,
        MIEN_NAM: 28000,
      },
    },
  ] as const;

  const seriesRecords: {
    id: string;
    code: string;
    unit: string;
    regions: Record<string, number>;
  }[] = [];

  for (const config of seriesConfigs) {
    const record = await prisma.priceSeries.upsert({
      where: { code: config.code },
      update: {
        name: config.name,
        unit: config.unit,
      },
      create: {
        code: config.code,
        name: config.name,
        unit: config.unit,
      },
    });

    seriesRecords.push({
      id: record.id,
      code: config.code,
      unit: config.unit,
      regions: config.regions,
    });
  }

  const today = new Date();
  for (let i = 45; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);

    for (const series of seriesRecords) {
      for (const [regionKey, base] of Object.entries(series.regions)) {
        const seasonal = Math.sin((i / 10) * Math.PI) * 400;
        const regionBias =
          regionKey === "MIEN_BAC" ? -150 : regionKey === "MIEN_TRUNG" ? 50 : 200;
        const value = base + regionBias + seasonal + Math.round(Math.random() * 500);

        await prisma.pricePoint.upsert({
          where: { seriesId_region_ts: { seriesId: series.id, region: regionKey, ts: d } },
          update: { value },
          create: {
            seriesId: series.id,
            region: regionKey,
            ts: d,
            value,
            source: "Seed",
          },
        });
      }
    }
  }
}

main().then(async () => {
  await prisma.$disconnect();
}).catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
