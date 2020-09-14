
const fs = require('fs');
var zTool = require("./zTool");
var onlineUserMap = new zTool.SimpleMap();
var historyContent = new zTool.CircleList(100);

var express = require('express');
var index = require('./routes/index');

var interface = express();

var chatLib = require("./chatLib");
var EVENT_TYPE = chatLib.EVENT_TYPE;

// 一些配置信息
const cfg = {
  port: 8888,
  ssl_key: './ssl/www.sunfengfeng.com.key',
  ssl_cert: './ssl/www.sunfengfeng.com.crt'
};

var http = require('http');
var httpsServer = require('https');

// var httpServer = http.createServer(interface);
const WebSocketServer = require('ws').Server; // 引用Server类

// httpServer.listen(80, function() {
//   console.log('HTTP Server is running on: http://localhost:%s', '80');
// });

// 创建request请求监听器
// const processRequest = (req, res) => {
//   fs.readFile('./home/index.html', function (err, fileData) {
//     res.writeHead(200, {'Content-Type':'text/html;charset=UTF8'});
//     res.end(fileData);
//   })
//   res.writeHead(200, {'Content-Type':'text/html;charset=UTF8'});
//   res.end('厉害了，我的WebSockets!\n');
// };

const app = httpsServer.createServer({
  // 向server传递key和cert参数
  key: fs.readFileSync(cfg.ssl_key),
  cert: fs.readFileSync(cfg.ssl_cert)
}, interface)
.listen(cfg.port);

interface.use(express.static('home'));

console.log('服 务 器 正 在 运 行...');

// 实例化WebSocket服务器
const wss = new WebSocketServer({
  server: app
});

// 如果有WebSocket请求接入，wss对象可以响应connection事件来处理
wss.on('connection', (socket) => {
  // console.log('服务器已启动，监听中~');
  socket.on('message', (message) => {
    var mData = chatLib.analyzeMessageData(message);
    if (mData && mData.EVENT) {
      switch (mData.EVENT) {
        case EVENT_TYPE.LOGIN: // 新用户连接
          var data = JSON.stringify(mData);
          console.log('新用户连接，广播给所有用户')
          socket.send(data, (err) => {
            if (err) {
              console.log(`服务器错误：${err}`);
            }
          });
          break;

        case EVENT_TYPE.SPEAK: // 用户发言

          var data = chatLib.getMsgFirstDataValue(mData);
          var data = JSON.stringify(mData);
          socket.send(data);
          historyContent.add({ 'user': onlineUserMap.get(socket.id), 'content': data, 'time': new Date().getTime() });
          break;

        case EVENT_TYPE.LOGOUT: // 用户请求退出

          // var user = mData.values[0];
          // onlineUserMap.remove(user.uid);
          // var data = JSON.stringify({
          //   'EVENT': EVENT_TYPE.LOGOUT,
          //   'values': [user],
          //   'onLineCounts': onlineUserMap.values().length
          // });
          // wss.sockets.emit('message', data);
          break;

        default:
          break;
      }
    } else {
      // 事件类型出错，记录日志，向当前用户发送错误信息
      console.log('desc:message,userId:' + socket.id + ',message:' + message);
      var data = JSON.stringify({
        'uid': socket.id,
        'EVENT': EVENT_TYPE.ERROR
      });
      socket.emit('message', data);
    }
  });

  // 监听用户断开连接 (退出聊天室)
  socket.on('close', function() {
    'use strict';
    console.log('用户退出了连接');
    if (onlineUserMap.map.hasOwnProperty(socket.name)) {
      var nick = onlineUserMap.map[socket.name].nick;
      delete onlineUserMap.map[socket.name];
      // onLineCounts--;
      var data = JSON.stringify({
        'EVENT': 'LOGOUT',
        'values': [nick],
        'onLineCounts': onlineUserMap.values().length
      });
      console.log('广播用户退出消息');
      /* 向所有客户端广播该用户退出群聊 */
      socket.send(data);
    }
  })
});
