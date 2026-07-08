import { FileNode } from './types';

export const initialFiles: FileNode[] = [
  {
    name: 'JavaScript',
    path: '/JavaScript',
    type: 'directory',
    children: [
      {
        name: 'HelloWorld.js',
        path: '/JavaScript/HelloWorld.js',
        type: 'file',
        content: `// Auto.js Hello World Sample
log("Hello world!!!");
toast("Hello, AutoJs!");
console.show();
`
      },
      {
        name: '数字.js',
        path: '/JavaScript/数字.js',
        type: 'file',
        content: `// Number and math operations
var a = 12.34;
var b = 56.78;
log("a + b = " + (a + b));
log("a * b = " + (a * b));
log("sin(pi/2) = " + Math.sin(Math.PI / 2));
`
      }
    ]
  },
  {
    name: '设备与设备信息',
    path: '/设备与设备信息',
    type: 'directory',
    children: [
      {
        name: '获取设备信息.js',
        path: '/设备与设备信息/获取设备信息.js',
        type: 'file',
        content: `// Display current device info
console.show();

var str = "";
str += "屏幕宽度:" + device.width;
str += "\\n屏幕高度:" + device.height;
str += "\\nbuildId:" + device.buildId;
str += "\\n主板:" + device.board;
str += "\\n制造商:" + device.brand;
str += "\\n型号:" + device.model;
str += "\\n产品名称:" + device.product;
str += "\\nbootloader版本:" + device.bootloader;
str += "\\n硬件名称:" + device.hardware;
str += "\\n唯一标识码:" + device.fingerprint;
str += "\\nIMEI: " + device.getIMEI();
str += "\\nAndroidId: " + device.getAndroidId();
str += "\\nMac: " + device.getMacAddress();
str += "\\nAPI: " + device.sdkInt;
str += "\\n电量: " + device.getBattery() + "%";

log(str);
`
      }
    ]
  },
  {
    name: '对话框',
    path: '/对话框',
    type: 'directory',
    children: [
      {
        name: '确认框.js',
        path: '/对话框/确认框.js',
        type: 'file',
        content: `// Ask a yes/no confirmation question
var handsome = confirm("你帅吗？");
if (handsome) {
    toast("真不要脸！");
    toast("真不要脸！");
    toast("真不要脸！");
    alert("系统提示", "真不要脸！");
} else {
    toast("嗯，算你诚实");
    log("用户回答了'不帅'");
}
`
      },
      {
        name: '简单计算器.js',
        path: '/对话框/简单计算器.js',
        type: 'file',
        content: `// A simple dialogue-driven calculator
var num1 = parseFloat(dialogs.input("请输入第一个数字", "10"));
var op = dialogs.singleChoice("请选择运算", ["加", "减", "乘", "除", "幂"]);
var num2 = parseFloat(dialogs.input("请输入第二个数字", "5"));
var result = 0;

switch(op) {
  case 0:
    result = num1 + num2;
    break;
  case 1:
    result = num1 - num2;
    break;
  case 2:
    result = num1 * num2;
    break;
  case 3:
    result = num1 / num2;
    break;
  case 4:
    result = Math.pow(num1, num2);
    break;
}

alert("运算结果", "结果为: " + result);
`
      }
    ]
  },
  {
    name: '定时器',
    path: '/定时器',
    type: 'directory',
    children: [
      {
        name: '循环执行.js',
        path: '/定时器/循环执行.js',
        type: 'file',
        content: `// Loop execution using setInterval
var i = 0;
log("开始循环执行...");

var id = setInterval(function() {
    i++;
    toast(i * 4 + "秒");
    log("经过了 " + (i * 4) + " 秒");
    if (i == 5) {
        log("达到5次，自动退出。");
        clearInterval(id);
    }
}, 4000);
`
      }
    ]
  },
  {
    name: 'HTTP网络请求',
    path: '/HTTP网络请求',
    type: 'directory',
    children: [
      {
        name: '获取网页.js',
        path: '/HTTP网络请求/获取网页.js',
        type: 'file',
        content: `// Fetch a web page using Auto.js HTTP module
var url = "www.baidu.com";
toast("正在获取: " + url);

var res = http.get(url);
if (res.statusCode == 200) {
    toast("请求成功");
    console.show();
    log("状态码: " + res.statusCode);
    log("网页内容前300字符:");
    log(res.body.string().substring(0, 300) + "...");
} else {
    toast("请求失败:" + res.statusMessage);
}
`
      }
    ]
  }
];
