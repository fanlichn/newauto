export interface DocItem {
  id: string;
  title: string;
  category: string;
  description: string;
  apiList: {
    signature: string;
    description: string;
    example: string;
  }[];
}

export const docItems: DocItem[] = [
  {
    id: 'console',
    title: 'Console - 控制台',
    category: '基础模块',
    description: '控制台模块用于输出调试信息、显示日志窗口等。在脚本运行时，console.show() 会弹出一个悬浮的日志控制台。',
    apiList: [
      {
        signature: 'console.show()',
        description: '显示控制台悬浮窗。',
        example: 'console.show();'
      },
      {
        signature: 'console.hide()',
        description: '隐藏控制台悬浮窗。',
        example: 'console.hide();'
      },
      {
        signature: 'console.clear()',
        description: '清空控制台的所有日志。',
        example: 'console.clear();'
      },
      {
        signature: 'log(message)',
        description: '在控制台输出一条普通日志，等同于 console.log()。',
        example: 'log("当前进度: 50%");'
      },
      {
        signature: 'console.info(message)',
        description: '输出一条提示/通知日志，通常显示为绿色或带标识。',
        example: 'console.info("网络请求成功");'
      },
      {
        signature: 'console.warn(message)',
        description: '输出一条警告日志，通常显示为黄色。',
        example: 'console.warn("电量过低警告！");'
      },
      {
        signature: 'console.error(message)',
        description: '输出一条错误日志，通常显示为红色。',
        example: 'console.error("未找到指定的UI控件");'
      }
    ]
  },
  {
    id: 'device',
    title: 'Device - 设备信息',
    category: '基础模块',
    description: 'device 模块提供了获取设备硬件信息、屏幕分辨率、电量、唯一标识等 API。',
    apiList: [
      {
        signature: 'device.width',
        description: '获取设备屏幕分辨率的物理宽度（像素）。',
        example: 'log("屏幕宽度: " + device.width);'
      },
      {
        signature: 'device.height',
        description: '获取设备屏幕分辨率的物理高度（像素）。',
        example: 'log("屏幕高度: " + device.height);'
      },
      {
        signature: 'device.brand',
        description: '获取设备的制造商/品牌名称。',
        example: 'log("手机品牌: " + device.brand);'
      },
      {
        signature: 'device.model',
        description: '获取设备的具体型号。',
        example: 'log("手机型号: " + device.model);'
      },
      {
        signature: 'device.getBattery()',
        description: '获取当前设备的剩余电量百分比（返回 0 ~ 100 的整数）。',
        example: 'log("当前电量: " + device.getBattery() + "%");'
      },
      {
        signature: 'device.sdkInt',
        description: '获取设备的 Android API 版本。',
        example: 'log("Android API: " + device.sdkInt);'
      },
      {
        signature: 'device.getMacAddress()',
        description: '获取设备的 MAC 地址。',
        example: 'log("MAC: " + device.getMacAddress());'
      }
    ]
  },
  {
    id: 'dialogs',
    title: 'Dialogs - 对话框',
    category: '交互模块',
    description: 'dialogs 模块提供了一系列经典的 Android 样式对话框，用于提示用户、接收输入或进行单选/多选交互。',
    apiList: [
      {
        signature: 'alert(title, content)',
        description: '显示一个警告对话框。只有一个“确定”按钮。',
        example: 'alert("提示", "脚本运行已结束");'
      },
      {
        signature: 'confirm(title, content)',
        description: '显示一个确认对话框，包含“确定”和“取消”按钮。返回布尔值。',
        example: 'if (confirm("是否开始运行?")) {\n  toast("开始运行");\n}'
      },
      {
        signature: 'dialogs.input(title, defaultValue)',
        description: '弹出一个输入框对话框，允许用户输入文本。返回输入的文本。',
        example: 'var name = dialogs.input("请输入您的名字", "张三");\nlog("用户名: " + name);'
      },
      {
        signature: 'dialogs.singleChoice(title, items, defaultIndex)',
        description: '弹出一个单选框列表。返回用户选择的索引（0开始）。',
        example: 'var index = dialogs.singleChoice("请选择难度", ["简单", "中等", "困难"], 1);\nlog("选择难度索引: " + index);'
      }
    ]
  },
  {
    id: 'globals',
    title: 'Globals - 全局函数',
    category: '基础模块',
    description: '无需加载即可直接在全局使用的通用函数，例如延时、弹窗通知、退出等。',
    apiList: [
      {
        signature: 'sleep(ms)',
        description: '使当前脚本线程暂停指定毫秒数。',
        example: 'log("准备启动...");\nsleep(2000);\nlog("已启动!");'
      },
      {
        signature: 'toast(message)',
        description: '弹出一个安卓样式的 Toast 短暂提示信息框。',
        example: 'toast("操作已完成");'
      },
      {
        signature: 'exit()',
        description: '立即停止运行当前脚本。',
        example: 'if (error) {\n  log("发生错误，脚本退出");\n  exit();\n}'
      }
    ]
  },
  {
    id: 'http',
    title: 'Http - 网络请求',
    category: '高阶模块',
    description: 'http 模块用于发送标准的 HTTP GET、POST 请求，支持设置 Headers、Body 并读取状态码、网页主体等。',
    apiList: [
      {
        signature: 'http.get(url)',
        description: '发起同步的 HTTP GET 请求，返回一个 Response 对象。',
        example: 'var res = http.get("www.baidu.com");\nlog("状态码: " + res.statusCode);'
      },
      {
        signature: 'http.post(url, data)',
        description: '发起同步的 HTTP POST 请求。',
        example: 'var res = http.post("https://httpbin.org/post", { name: "autojs" });\nlog(res.body.string());'
      },
      {
        signature: 'response.statusCode',
        description: '获取 HTTP 状态码（如 200, 404 等）。',
        example: 'if (res.statusCode == 200) { log("成功"); }'
      },
      {
        signature: 'response.body.string()',
        description: '以字符串形式返回响应主体。只能调用一次。',
        example: 'var html = res.body.string();\nlog("网页大小: " + html.length);'
      }
    ]
  },
  {
    id: 'storages',
    title: 'Storages - 本地存储',
    category: '高阶模块',
    description: 'storages 模块提供本地数据持久化存储。类似于 Web 的 localStorage，可存取数字、字符串、对象等。',
    apiList: [
      {
        signature: 'storages.create(name)',
        description: '创建或打开一个指定名称的本地存储分区，返回 Storage 对象。',
        example: 'var storage = storages.create("user_config");'
      },
      {
        signature: 'storage.put(key, value)',
        description: '保存一个键值对到本地。',
        example: 'storage.put("volume", 80);'
      },
      {
        signature: 'storage.get(key, defaultValue)',
        description: '根据键获取本地保存的值。如果不存在则返回默认值。',
        example: 'var vol = storage.get("volume", 50);\nlog("音量: " + vol);'
      },
      {
        signature: 'storage.remove(key)',
        description: '移除指定的本地存储键。',
        example: 'storage.remove("volume");'
      },
      {
        signature: 'storage.clear()',
        description: '清空当前存储分区中的所有键值对。',
        example: 'storage.clear();'
      }
    ]
  }
];
