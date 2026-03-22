"""
色彩提取工具
使用 PIL 和 extcolors 库提取图片主色调
"""

from PIL import Image
import extcolors
from typing import List, Dict


def rgb_to_hex(rgb: tuple) -> str:
    """将 RGB 转换为 HEX 格式"""
    return '#{:02x}{:02x}{:02x}'.format(rgb[0], rgb[1], rgb[2])


def extract_colors_from_image(image: Image.Image, num_colors: int = 8) -> List[Dict]:
    """
    从图片中提取主色调
    
    Args:
        image: PIL Image 对象
        num_colors: 要提取的颜色数量
    
    Returns:
        颜色列表，每个颜色包含 hex 值和占比
    """
    try:
        # 调整图片大小以提高处理速度
        image.thumbnail((300, 300))
        
        # 提取颜色
        colors, pixel_count = extcolors.extract_from_image(image, tolerance=12, limit=num_colors)
        
        # 计算总像素数
        total_pixels = sum(count for _, count in colors)
        
        # 格式化结果
        color_data = []
        for color, count in colors:
            percentage = round((count / total_pixels) * 100, 1)
            color_data.append({
                'hex': rgb_to_hex(color),
                'rgb': {'r': color[0], 'g': color[1], 'b': color[2]},
                'percentage': percentage,
                'pixel_count': count
            })
        
        return color_data
    
    except Exception as e:
        raise Exception(f"Color extraction failed: {str(e)}")


def get_dominant_color(image: Image.Image) -> Dict:
    """
    获取图片的主导色
    
    Args:
        image: PIL Image 对象
    
    Returns:
        主导色信息
    """
    colors = extract_colors_from_image(image, num_colors=1)
    return colors[0] if colors else None


def get_color_palette(image: Image.Image, num_colors: int = 5) -> List[str]:
    """
    获取图片的色彩调色板（仅返回 HEX 值）
    
    Args:
        image: PIL Image 对象
        num_colors: 调色板颜色数量
    
    Returns:
        HEX 颜色值列表
    """
    colors = extract_colors_from_image(image, num_colors=num_colors)
    return [color['hex'] for color in colors]
