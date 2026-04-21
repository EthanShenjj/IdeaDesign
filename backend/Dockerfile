# 使用 playwright 官方 python 镜像，它已经预装了浏览器运行所需的所有系统依赖
FROM mcr.microsoft.com/playwright/python:v1.40.0-jammy

# 设置工作目录
WORKDIR /app

# 复制依赖文件
COPY requirements.txt .

# 安装 Python 依赖
RUN pip install --no-cache-dir -r requirements.txt

# 安装必要的浏览器（这里只需要 chromium）
RUN playwright install chromium

# 复制后端所有代码
COPY . ./

# 创建上传文件夹和数据文件夹
RUN mkdir -p uploads data

# 设置环境变量
ENV PORT=5001
ENV PYTHONUNBUFFERED=1

# 暴露端口
EXPOSE 5001

# 启动命令
CMD ["python", "app.py"]
