"""
网页截图工具
使用 Playwright 对网页进行截图，用于视觉风格分析
"""

import base64
import time
from io import BytesIO
from typing import Optional, Tuple

from PIL import Image


def capture_webpage_screenshot(
    url: str,
    viewport_width: int = 1440,
    viewport_height: int = 900,
    full_page: bool = False,
    wait_seconds: float = 2.0,
    max_size: int = 1024
) -> Tuple[Optional[str], Optional[str]]:
    """
    对网页进行截图并返回 base64 编码的图片数据

    Args:
        url: 网页 URL
        viewport_width: 视口宽度
        viewport_height: 视口高度
        full_page: 是否截取整页（默认否，只截取首屏）
        wait_seconds: 等待页面加载完成后的额外等待时间
        max_size: 图片最大边长

    Returns:
        (base64_image_data, error_message) - 成功时 error 为 None，失败时 data 为 None
    """
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return None, "Playwright is not installed. Run: pip install playwright && python -m playwright install chromium"

    try:
        print(f"[SCREENSHOT] Starting screenshot for: {url}")
        start_time = time.time()

        with sync_playwright() as p:
            # 启动无头浏览器
            browser = p.chromium.launch(
                headless=True,
                args=[
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                ]
            )

            # 创建页面
            context = browser.new_context(
                viewport={'width': viewport_width, 'height': viewport_height},
                device_scale_factor=2,  # 高清截图
                locale='zh-CN',
                timezone_id='Asia/Shanghai',
            )

            page = context.new_page()

            # 导航到页面
            try:
                page.goto(url, wait_until='networkidle', timeout=30000)
            except Exception:
                # networkidle 超时时，退回到 load 事件
                try:
                    page.goto(url, wait_until='load', timeout=15000)
                except Exception as nav_err:
                    browser.close()
                    return None, f"Failed to load page: {str(nav_err)}"

            # 额外等待，让懒加载内容和动画完成
            page.wait_for_timeout(int(wait_seconds * 1000))

            # 截图
            screenshot_bytes = page.screenshot(
                full_page=full_page,
                type='jpeg',
                quality=90
            )

            browser.close()

        elapsed = round(time.time() - start_time, 2)
        print(f"[SCREENSHOT] Screenshot captured in {elapsed}s, size: {len(screenshot_bytes)} bytes")

        # 用 PIL 处理优化
        img = Image.open(BytesIO(screenshot_bytes))

        if img.mode != 'RGB':
            img = img.convert('RGB')

        # 缩放到合理尺寸
        if max(img.size) > max_size:
            ratio = max_size / max(img.size)
            new_size = tuple(int(dim * ratio) for dim in img.size)
            img = img.resize(new_size, Image.Resampling.LANCZOS)
            print(f"[SCREENSHOT] Image resized to: {new_size}")

        # 转为 base64
        buffer = BytesIO()
        img.save(buffer, format='JPEG', quality=85, optimize=True)
        buffer.seek(0)
        image_data = base64.b64encode(buffer.read()).decode('utf-8')

        print(f"[SCREENSHOT] Base64 data length: {len(image_data)}")
        return image_data, None

    except Exception as e:
        print(f"[SCREENSHOT ERROR] {str(e)}")
        return None, f"Screenshot failed: {str(e)}"
