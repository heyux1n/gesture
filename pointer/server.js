const express = require('express')
const path = require('path')

const app = express()

// 设置静态文件目录
app.use(express.static(path.join(__dirname, './')))

// 启动服务器
app.listen(3000, () => {
  console.log('服务器已启动，访问 http://localhost:3000')
})
