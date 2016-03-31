// ==UserScript==
// @name                360Exporter
// @namespace           https://github.com/Kumhy/360Exporter
// @version             0.0.1
// @description         360网盘Aria2下载
// @match               *://*.yunpan.360.cn/*
// @copyright           2016+, Kuma
// ==/UserScript==

var Ex = {
    init: function () {
        var d = document;
        var s = d.createElement('script');
        s.id = '360Exporter';
        s.type = 'text/javascript';
        s.textContent = '(' + this.load.toString() + ')(window.jQuery)';
        d.body.appendChild(s);
    },
    load: function ($) {
        var setting_panel;

        var base = {
            init: function () {
                this.dom_init();
                this.header.setHeader();
                this.config.init(); //初始化RPC配置
                this.aria2_init();
                $('#rpcsetting').click(function () {
                    setting_panel.show();
                });

                $('#aria2_dl').click(function () {
                    base.getSelFiles();
                });

                $('#aria2_menu_dl').click(function () {
                    yunpan.menuManager.hideAll();
                    base.getSelFiles();
                });
            },
            dom_init: function () {
                var html = '<span id="rpcsetting" class="y-btn y-btn-gray setting show">'
                        + '<i class="icon icon-extract-on"></i>'
                        + '<span class="label">RPC设置</span>'
                        + '</span>';
                $('#tbNew').before(html);

                html = '<li data-cn="aria2_menu_dl" class="item aria2_dl show">'
                        + '<a id="aria2_menu_dl" href="#" onclick="return false;"><i class="icon icon-dl"></i>'
                        + '<span class="text">Aria2下载</span>'
                        + '</a></li>';
                $('#x-yp-3 ul').prepend(html);

                html = '<span id="aria2_dl" class="y-btn y-btn-gray pack-dl">'
                        + '<i class="icon icon-download"></i><span class="label">Aria2下载</span></span>';
                $('#tbPackDl').before(html);

                var tpl = ['<div style="width: 400px">',
                    '<div style="font-size: 14px;line-height: 2;color: #aaa;margin-bottom: 10px;">Aria2 版本：<span id="rpc_status">未连接</span></div>',
                    '<div style="font-size: 14px;line-height: 2;padding-bottom: 15px;">',
                    '<div style="float: left">RPC地址：</div>',
                    '<input style="width: 70%;" id="aria2_rpc_url_id">',
                    '</div>',
                    "</div>"].join("");
                setting_panel = yunpan.dialog.create({
                    body: tpl,
                    title: "RPC设置",
                    withClose: !0,
                    buttons: [
                        {text: "保存", type: "blue", handler: function () {
                                base.config.save();
                                setting_panel.hide();
                            }},
                        {text: "取消", handler: function () {
                                setting_panel.hide();
                            }}
                    ]
                });
            },
            aria2_init: function () {
                ARIA2.init(this.config.jsonrpc_path, function () {
                    ARIA2.get_version();
                });
            },
            config: {
                init: function () {
                    this.jsonrpc_path = localStorage.getItem("jsonrpc_path") || "http://localhost:6800/jsonrpc";
                    $('#aria2_rpc_url_id').val(this.jsonrpc_path);
                },
                save: function () {
                    var _url = $('#aria2_rpc_url_id').val();
                    if (_url !== undefined && this.jsonrpc_path !== _url) {
                        this.jsonrpc_path = _url;
                        localStorage.setItem("jsonrpc_path", this.jsonrpc_path);
                        base.aria2_init();
                    }
                }
            },
            aria2_dl: function (data) {
                ARIA2.request('addUri', data, function (result) {
                    if (result.result) {
                        msg.info("添加下载任务成功，请转到YAAW查看任务！");
                    }
                });
            },
            getSelFiles: function () {
                msg.load('正在准备开始添加下载任务!');
                var sel_files = yunpan.fo.getSelectFile();
                var length = sel_files.length;
                if (!length || 0 === length) {
                    msg.error("请选择需要下载的文件或目录！");
                    return;
                }

                for (var i = 0; i < length; i++) {
                    var f = sel_files[i];
                    var file = {
                        type: f.attr("data-type"),
                        fileName: f.attr("data-title"),
                        path: f.attr("data-path"),
                        nid: f.attr("data-nid")
                    };

                    if (file.type !== "folder") {
                        this.getFile(file);
                    } else {
                        this.getFolderList(file);
                    }
                }
            },
            getFile: function (file) {
                var _this = this;
                $.ajax({
                    url: yunpan.config.url.f_down,
                    data: {nid: file.nid, fname: file.path, ajax: 1},
                    type: 'post',
                    dataType: 'json',
                    success: function (result, textStatus, jqXHR) {
                        if (result.errno === 0) {
                            var data = result.data;
                            var dl_file = [
                                [data.download_url],
                                {
                                    out: file.path,
                                    header: _this.header.getHeader()
                                }
                            ];

                            _this.aria2_dl(dl_file);
                        } else {
                            msg.error(result.errmsg);
                            console.log(result);
                        }
                    },
                    error: function (jqXHR, textStatus, errorThrown) {
                        console.log('解析失败：' + file.path);
                    }
                });
            },
            getFolderList: function (file) {
                var _this = this;
                $.ajax({
                    url: yunpan.config.url.getList,
                    data: {field: file.fileName, path: file.path},
                    type: 'post',
                    dataType: 'text',
                    success: function (result, textStatus, jqXHR) {
                        var data = result.evalExp();
//                        console.log(data);
                        if (data.errno == 0) {
                            msg.info("获取 " + file.path + " 目录列表成功!");
                            var array = data.data;
                            for (var i = 0; i < array.length; i++) {
                                var f = array[i];
                                f.fileName = f.oriName;
                                if (f.isDir == 1) {
                                    _this.getFolderList(array[i]);
                                } else if (f.fileType == 'file') {
                                    _this.getFile(f);
                                }
                            }
                        }
                    },
                    error: function (jqXHR, textStatus, errorThrown) {
                        console.log('解析目录失败：' + file.path);
                    }
                });
            },
            header: {
                setHeader: function () {
                    this.header = [];
                    var userAgent = navigator.userAgent.toString();
                    var location = document.location;
                    var referer = location.origin + location.pathname;
                    var yunPanCookie = document.cookie;
                    var cookies = yunPanCookie.split('; ');

                    this.header.push("User-Agent: " + userAgent);
                    this.header.push("Referer: " + referer);
                    this.header.push("Cookie: " + cookies.join("; "));
                },
                getHeader: function () {
                    return this.header;
                }
            }
        };

        var ARIA2 = (function () {
            var wsUri, websocket, rpc_secret = null,
                    unique_id = 0, ws_callback = {};

            function request_auth(url) {
                return url.match(/^(?:(?![^:@]+:[^:@\/]*@)[^:\/?#.]+:)?(?:\/\/)?(?:([^:@]*(?::[^:@]*)?)?@)?/)[1];
            }
            function remove_auth(url) {
                return url.replace(/^((?![^:@]+:[^:@\/]*@)[^:\/?#.]+:)?(\/\/)?(?:(?:[^:@]*(?::[^:@]*)?)?@)?(.*)/, '$1$2$3');
            }

            return {
                init: function (path, onready) {
                    wsUri = path || "http://localhost:6800/jsonrpc";
                    var auth_str = request_auth(wsUri);
                    if (auth_str && auth_str.indexOf('token:') == 0) {
                        rpc_secret = auth_str;
                        wsUri = remove_auth(wsUri);
                    }

                    if (wsUri.indexOf("http") === 0) { //http协议
                        wsUri = wsUri.replace('http:', 'ws:');
                    }

                    if (wsUri.indexOf("ws") === 0 && WebSocket) { //ws协议
                        websocket = new WebSocket(wsUri);

                        websocket.onmessage = function (event) {
                            var data = JSON.parse(event.data);
//                    console.debug(data);
                            if ($.isArray(data) && data.length) {
                                var id = data[0].id;
                                if (ws_callback[id]) {
                                    ws_callback[id].success(data);
                                    delete ws_callback[id];
                                }
                            } else {
                                if (ws_callback[data.id]) {
                                    if (data.error)
                                        ws_callback[data.id].error(data);
                                    else
                                        ws_callback[data.id].success(data);
                                    delete ws_callback[data.id];
                                }
                            }
                        };

                        websocket.onerror = function (event) {
                            console.warn("error", event);
                            msg.error("Aria2服务连接失败，请检查RPC设置.");
                            ws_callback = {};
                            $("#rpc_status").text("未连接");
                        };

                        websocket.onopen = function () {
                            ARIA2.request = ARIA2.request_ws;
                            ARIA2.batch_request = ARIA2.batch_request_ws;
                            if (onready)
                                onready();
                        };
                    } else { //异常
                        msg.error("rpc协议错误，请检查设置！");
                    }
                },
                request: function () {
                },
                batch_request: function () {
                },
                _request_data: function (method, params, id) {
                    var dataObj = {
                        jsonrpc: '2.0',
                        method: 'aria2.' + method,
                        id: id
                    };
                    if (typeof (params) !== 'undefined') {
                        dataObj.params = params;
                    }
//                    console.log(dataObj);
                    return dataObj;
                },
                _get_unique_id: function () {
                    ++unique_id;
                    return unique_id;
                },
                request_ws: function (method, params, success, error) {
                    var id = ARIA2._get_unique_id();
                    ws_callback[id] = {
                        'success': success || function () {
                        },
                        'error': error || msg.error
                    };
                    if (rpc_secret) {
                        params = params || [];
                        if (!$.isArray(params))
                            params = [params];
                        params.unshift(rpc_secret);
                    }
                    try {
                        websocket.send(JSON.stringify(ARIA2._request_data(method, params, id)));
                    } catch (ex) {
                        msg.error(ex);
                    }
                },
                batch_request_ws: function (method, params, success, error) {
                    var data = [];
                    var id = ARIA2._get_unique_id();
                    ws_callback[id] = {
                        'success': success || function () {
                        },
                        'error': error || msg.error
                    };
                    for (var i = 0, l = params.length; i < l; i++) {
                        var n = params[i];
                        n = n || [];
                        if (!$.isArray(n))
                            n = [n];
                        if (rpc_secret) {
                            n.unshift(rpc_secret);
                        }
                        data.push(ARIA2._request_data(method, n, id));
                    }
                    websocket.send(JSON.stringify(data));
                },
                get_version: function () {
                    this.request("getVersion", [],
                            function (result) {
                                if (!result.result) {
                                    msg.error('<strong>Error: </strong>rpc result error.');
                                }

                                $("#rpc_status").text("Aria2 " + result.result.version || "");
                                msg.info("连接Aria2服务器成功，当前版本： " + result.result.version);
                            }
                    );
                }
            };
        })();

        var msg = {
            load: function (result) {
                yunpan.tips.show(result);
            },
            success: function (result) {
                yunpan.tips.show(result);
            },
            error: function (result) {
                var error_msg = msg.get_errorMsg(result);
                yunpan.tips.show(error_msg);
            },
            info: function (result) {
                yunpan.tips.show(result);
            },
            hide: function () {
                yunpan.tips.hide();
            },
            get_errorMsg: function (result) {
                if (typeof result == "string")
                    return result;
                else if (typeof result.error == "string")
                    return result.error;
                else if (result.error && result.error.message)
                    return result.error.message;
            }
        };

        base.init();
    }
};

Ex.init();