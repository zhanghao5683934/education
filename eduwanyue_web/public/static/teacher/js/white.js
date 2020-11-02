    function handelRes(data){
        if(data.url!=''){
            layer.msg(data.msg,{},function(){
                location.href=data.url;
            });
        }else{
            layer.msg(data.msg);
        }
    }

    function cloneObject(obj){
        return JSON.parse(JSON.stringify(obj))
    }
    function nodejsInit(){
        $.ajax({
            url:'/teacher/liveing/setNodeInfo',
            type:'POST',
            data:{user_type:_DATA.roominfo.user_type},
            dataType:'json',
            success:function(data){
                if(data.code==0){
                    handelRes(data);
                    return !1;
                }
                
                var socket_data={uid:_DATA.userinfo.id,token:_DATA.userinfo.token,stream:stream,roomnum:_DATA.roominfo.liveuid};
                Socket.nodejsInit(socket_data);
            },
            error:function(e){
                layer.msg('信息错误');
            }
        })
    }
    //进入声网房间
    function joinAgora(type=0){
        //先检查一下是否和现在的浏览器相匹配
        var isgo=AgoraRTC.checkSystemRequirements();
        if(!isgo){
            alert('当前浏览器不支持，请更换浏览器或者升级该浏览器，如:谷歌浏览器');
            return ;
        }
        rtc.client = AgoraRTC.createClient({mode: 'live', codec: "h264"});

        //加载声网回调
        handleEvents(rtc);
        //初始化房间
        rtc.client.init(option.appID, function () {
            // 初始化成功房间后老师和学生加入房间
            rtc.client.join(option.token, option.channel,parseInt(_DATA.userinfo.id) , function (uid) {
                console.log("join channel: " + option.channel + " success, uid: " + uid);
                rtc.params.uid = uid;
                if(type==1){
                    startPush();
                }
                
            }, function(err) {
                layer.msg('进入房间失败请稍后重试');
                console.error("client join failed", err)
            })
            
        }, function (err) {
            console.log("AgoraRTC client init failed", err);

            layer.msg('房间初始化失败，请稍后重试');
        });

    }

    //声网的一些回调
    function handleEvents (rtc) {
        //本地推流回调
        rtc.client.on("stream-published", function(evt) {
            // console.log('本地流推了');
            // console.log(evt.stream);
            // console.log(evt.stream.getId());
            //$('.body_left_top_status').html('上课中');
            $('.body_right_video_wait').css('display','none');
            $('.body_right_video_caozuo').css('display','block');
            $('.live_start').hide();
            $('.live_resume').hide();
            $('.live_end').show();
            if(_DATA.roominfo.user_type==1){
                
                if(!whiteWebSdk){
                    joinWhite();
                }
                
                var ispush=1;
                timeInterval.rttInterval(ispush);
                
                if(ismuteAudio){
                    rtc.localStream.muteAudio();
                    var msg = '{"msg":[{"_method_":"setLiveModel","uid":"'+_DATA.userinfo.id+'","action":"1","source":"PC","touid":"'+_DATA.userinfo.id+'"}],"retcode":"000000","retmsg":"OK"}';
                    Socket.emitData('broadcast',msg);
                }
                
                if(ismuteVideo){
                    rtc.localStream.muteVideo();
                    var msg = '{"msg":[{"_method_":"setLiveModel","uid":"'+_DATA.userinfo.id+'","action":"3","source":"PC","touid":"'+_DATA.userinfo.id+'"}],"retcode":"000000","retmsg":"OK"}';
                    Socket.emitData('broadcast',msg);
                }
                
                /* 录制 */
                $.ajax({
                    type: "POST",
                    url:'/teacher/liveing/createRecord',
                    data:{courseid:courseid,lessonid:lessonid},
                    dataType:'json',
                    error: function(request)
                    {
                        console.log('请求错误');
                    },
                    success: function(data)
                    {
                        console.log(data);
                    }
                })
            }
        })

        //异地推流成功后回调
        rtc.client.on("stream-added", function(evt) {
            // console.log('异地流推了');
            // console.log(evt);
            var remoteStream = evt.stream;
            var id = remoteStream.getId();

            // console.log('异地流推了');
            // console.log(id);
            //接受远端流

            if(id==999999999){ //共享屏幕推流
                if( _DATA.roominfo.user_type!=1 ){ //如果你不是老师就接受流
                    rtc.client.subscribe(remoteStream, function (err) {
                        console.log("stream subscribe failed", err);
                    })
                }
            }else{
                if (id !== _DATA.userinfo.id) {
                    //console.log('不是自己推流');
                    rtc.client.subscribe(remoteStream, function (err) {
                        console.log("stream subscribe failed", err);
                    })
                }
            }
        })

        //接受远端成功回调之后播放流
        rtc.client.on("stream-subscribed", function (evt) {
            //console.log(evt);
            var remoteStream = evt.stream;
            var id = remoteStream.getId();
            console.log('接受远端流--'+id);
            if(id!=999999999){
                rtc.remoteStreams.push(remoteStream);
                //获取信息之后再播放
                if(id==_DATA.teacherinfo.id){
                    /* 讲师的流 */
                    if(_DATA.roominfo.user_type!=1){
                        $('.body_right_video_wait').hide();
                        remoteStream.play("local_stream",{fit: "contain"},function(errState){
                            var isPlay=checkBrowser.myBrowser();
                            if (errState && errState.status !== "aborted" && isPlay==false){
                                // 播放失败，一般为浏览器策略阻止。引导用户用手势触发恢复播放。
                                layer.confirm('由于浏览器的限制，需要手动点击播放，建议使用最新谷歌浏览器进行观看直播', {
                                    title:'提示',
                                    btn: ['播放','取消'] //按钮
                                }, function(index){
                                    layer.close(index);
                                    remoteStream.resume().then(
                                        function (result) {
                                            console.log('恢复成功：' + result);
                                        }).catch(
                                            function (reason) {
                                            layer.msg('播放失败，建议使用最新谷歌浏览器');
                                            console.log('恢复失败：' + reason);
                                        });
                                }, function(){
                                });
                            
                            }
                        });
                    }
                }else{
                    Linkmic.getLinkInfo(id,remoteStream);
                }
                
                console.log('stream-subscribed remote-uid: ', id);
                
            }else{  //老师共享屏幕的流
                // console.log(evt);
                rtc.remoteStreams_screen.push(remoteStream);
                
                //获取信息之后再播放
                teacherscreen.upScreen(1);
                
                remoteStream.play("screen",{fit: "contain"},function(errState){
                    var isPlay=checkBrowser.myBrowser();
                    if (errState && errState.status !== "aborted" && isPlay==false){
                        // 播放失败，一般为浏览器策略阻止。引导用户用手势触发恢复播放。
                        layer.confirm('由于浏览器的限制，需要手动点击播放，建议使用最新谷歌浏览器进行观看直播', {
                            title:'提示',
                            btn: ['播放','取消'] //按钮
                        }, function(index){
                            layer.close(index);
                            remoteStream.resume().then(
                                function (result) {
                                    console.log('恢复成功：' + result);
                                }).catch(
                                    function (reason) {
                                    layer.msg('播放失败，建议使用最新谷歌浏览器');
                                    console.log('恢复失败：' + reason);
                                });
                        }, function(){
                        });
                    
                    }
                });
                console.log('stream-subscribed remote-uid: ', id);
            }

        })

        //推流结束回调
        rtc.client.on("stream-removed", function (evt) {
            var remoteStream = evt.stream;
            var id = remoteStream.getId();

            remoteStream.stop();
            if(id!=999999999){
                if(id==_DATA.teacherinfo.id){
                    $('.body_right_video_wait').css('display','block');
                    if(_DATA.roominfo.user_type==1){
                        var ispush=0;
                        timeInterval.rttInterval(ispush,remoteStream);
                    }
                }
                
                rtc.remoteStreams = rtc.remoteStreams.filter(function (stream) {
                    return stream.getId() != id
                })
                
                rtc.client.unsubscribe(remoteStream, function (err) {
                    console.log("stream unsubscribe failed", err);
                })

                //进行样式修改
                if(id!=_DATA.teacherinfo.id){
                    Linkmic.delView(id);
                }
            }else{ //共享屏幕推流结束
                rtc.remoteStreams_screen = rtc.remoteStreams_screen.filter(function (stream) {
                    return stream.getId() != id
                })
    
                rtc.client.unsubscribe(remoteStream, function (err) {
                    console.log("stream unsubscribe failed", err);
                })
                
                teacherscreen.upScreen(0);
            } 
        })

        //关闭音频轨道回调
        rtc.client.on("mute-audio", function(evt) {
            var uid = evt.uid;
            console.log("mute audio:" + uid);
            //alert("mute audio:" + uid);
        });
        //开启音频轨道回调
        rtc.client.on("unmute-audio", function (evt) {
            var uid = evt.uid;
            console.log("unmute audio:" + uid);
            
        });
        //关闭视频轨道回调
        rtc.client.on("mute-video", function (evt) {
            var uid = evt.uid;
            console.log("mute video" + uid);
        })
        //开启视频轨道回调
        rtc.client.on("unmute-video", function (evt) {
            var uid = evt.uid;
            console.log("unmute video:" + uid);
        })

        //有用户离开房间
        rtc.client.on("peer-leave", function(evt) {
            //console.log('有人离线了');
            var uid = evt.uid;
            var reason = evt.reason;

            console.log("remote user left ", uid, "reason: ", reason);
            for(var i=0;i<rtc.remoteStreams.length;i++){
                if(rtc.remoteStreams[i].getId()==uid){ //掉线的这个人正在连麦
                    rtc.remoteStreams[i].stop();
                    if(uid==_DATA.teacherinfo.id){ //老师掉线了
                        $('.body_right_video_wait').css('display','block');
                        layer.msg('老师离开了房间');

                    }else{ //学生的话需要进行操作
                        Linkmic.delView(uid);

                    }
                    
                    rtc.client.unsubscribe( rtc.remoteStreams[i], function (err) {
                        console.log("stream unsubscribe failed", err);
                    })
    
                    break;
                }
            }

            rtc.remoteStreams = rtc.remoteStreams.filter(function (stream) {
                return stream.getId() != uid
            })
            
            //如果在共享屏幕需要停止推流
            //老师离线了
            if(rtc.remoteStreams_screen!='' && uid==999999999){
                //学生相应的做出操作
                teacherscreen.upScreen(0);

                rtc.client.unsubscribe( rtc.remoteStreams_screen[0], function (err) {
                    console.log("stream unsubscribe failed", err);
                })

                rtc.remoteStreams_screen = rtc.remoteStreams_screen.filter(function (stream) {
                    return stream.getId() != 999999999
                })
            }
        });
    }

    //白板重置大小
    function refreshViewSize() {
        // 将 room 变量暴露在全局变量时的操作。
        whiteroom && whiteroom.refreshViewSize();
    }
    //进入白板房间
    function joinWhite(){
        //这是进入白板房间
        var uuid=_DATA.roominfo.uuid;
        var roomToken=_DATA.roominfo.roomtoken;
        var appid=_DATA.roominfo.netless_appid;

        // 更多初始化 sdk 参数，请查看[初始化参数]文档
        whiteWebSdk = new WhiteWebSdk({
            appIdentifier: appid
        });

        var isteach= _DATA.roominfo.user_type==1? true:false;
        if(isteach){
            $('.body_left_bottom_top_button').show();
            $('#caozuo').show();
        }
        
        /* 其他人看操作白板的光标是用户的头像 */
        function createCursorElement(iconURL) {
            var containerElement = document.createElement("div");
            var iconURLElement = document.createElement("img");
            containerElement.append(iconURLElement);
            iconURLElement.setAttribute("src", iconURL);
            iconURLElement.setAttribute("class", 'whiteboard_img');
            return containerElement;
        }
        var roomMembers = [];
        var cursorAdapter = {
            createCursor: function(memberId) {
                    return {x: 16, y: 16, width: 20, height: 20};
            },
            onAddedCursor: function(cursor) {
                for (var i = 0; i < roomMembers.length; i ++) {
                    var roomMember = roomMembers[i];
                    if (roomMember.memberId === cursor.memberId) {
                        // 其中 iconURL、color 应该由用户自定义到 payload 中
                        var payload = roomMember.payload;
                        var cursorElement = createCursorElement(payload.avatar);
                   
                        cursor.divElement.append(cursorElement);
                        break;
                    }
                }
            },
            onRemovedCursor: function(cursor) {
                // 清理工作
            },
        };
        
        /* 其他人看操作白板的光标是用户的头像 */
        
        // 更多初始化 房间 参数，请查看[初始化参数]文档
        whiteWebSdk.joinRoom({
            uuid: uuid,
            roomToken: roomToken,
            cursorAdapter:cursorAdapter,
            userPayload: {
                // userPayload 可以根据业务自行自定义
                // nickname: "your-nick-name",
                avatar: _DATA.userinfo.avatar,
              },
            isWritable:isteach //老师进来可以写
        },
        {
            onRoomStateChanged: function(modifyState) {
                if (modifyState.roomMembers) {
                    roomMembers = modifyState.roomMembers;
                }
            }
        }
        ).then(function(room) {
            //将 room 实例绑定在全局变量中。后续所有 API 实例，都会直接调用 room
            window.whiteroom = room;
            // console.log('132');
            // console.log(whiteroom.state.sceneState);
            
            whiteroom.bindHtmlElement(document.getElementById("whiteboard"));
            
            whiteroom.file_uuid= _DATA.roominfo.file_uuid;  //老师之前上传的最后一个文档转图片的uuid

            //老师进来之后先把教具改成铅笔
            if(isteach){
                whiteroom.setMemberState({
                    currentApplianceName: "pencil",
                    strokeColor: [52, 68, 90],
                    strokeWidth: 4,
                    textSize: 8,
                });
                $('.body_left_bottom_top_c_img').eq(1).attr('src','/static/teacher/images/white/pencil1.png');
                whiteinfo.strokeWidth=4;
                whiteinfo.strokeColor=[52, 68, 90];
                whiteinfo.textSize=15;
                whiteinfo.currentApplianceName='pencil';
            }
            window.addEventListener("resize", refreshViewSize);
            
            // console.log(whiteroom.scenePathType('/'+whiteroom.file_uuid));
            
            // whiteroom.setScenePath('/'+whiteroom.file_uuid+'/');
            
            // console.log(whiteroom.state.sceneState);
            setTimeout(function(){
                //判断是不是在初始白板页面，不是需要添加东西
                if(whiteroom.state.sceneState.scenePath!='/init'){
                    addPptPage();
                }else{
                    if(whiteroom.file_uuid!=''){
                        addPagePpt();
                    }
                }
            },1000)
        })      

    }
    
    //预览
    function preview(type=0){
        //创建流
        var localStream = AgoraRTC.createStream({
            streamID: option.uid,
            audio:true,
            video:true,
            screen:false,
            microphoneId: selectedMicrophoneId,
            cameraId: selectedCameraId
        });
        rtc.localStream=localStream;
        //初始化流
        rtc.localStream.init(function () {
            console.log("init local stream success");
            rtc.localStream.play("local_stream",{fit: "contain"},function(errState){
                var isPlay=checkBrowser.myBrowser();
                if (errState && errState.status !== "aborted" && isPlay==false){
                    layer.msg('由于浏览器的限制，需要手动点击老师画面进入播放');
                    var html='<img class="body_right_video_play" src="/static/teacher/images/white/play.png">';
                    $('#local_stream').append(html);
                    
                    document.querySelector("#local_stream").onclick=function(){
                        rtc.localStream.resume().then(
                            function (result) {
                                $('#local_stream .body_right_video_play').hide();
                                console.log('恢复成功：' + result);
                            }).catch(
                            function (reason) {
                                layer.msg('播放失败，建议使用最新谷歌浏览器');
                                console.log('恢复失败：' + reason);
                        });
                    }
                }else{
                    $('#local_stream .body_right_video_play').hide();
                }
            });
            
            $('.body_right_video_wait').hide();
            Live.islocalstream=1;
            if(type==1){
                startPush();
            }

        }, function (err) {
            layer.msg('请检查麦克风和摄像头是否正常');
            console.error("init local stream failed ", err);
            Live.clear();
        })
    }
    //开始推流上课
    function startPush(){
        //成功之后推流
        if (!rtc.client) {
            layer.msg('房间初始化失败，请重新进入房间');
            return;
        }
        // if (rtc.published) {
        //     layer.msg('你已经推流了，请结束推流后重新开播');
        //     return;
        // }
        // var oldState = rtc.published;

        // publish localStream
        rtc.client.publish(rtc.localStream, function (err) {
            //rtc.published = oldState;
            layer.msg('本地推流失败请重新进入房间进行推流');
            console.log("publish failed");
            console.error(err);
            Live.clear();
            return ;
        })
        //rtc.published = true;
    }

    //结束推流下课
    function endPush(){
        // console.log(rtc.localStream);
        rtc.client.unpublish(rtc.localStream, function(err) {
            console.log(err);
        })  
        $('.body_right_video_wait').show();
        $('.body_right_video_caozuo').hide();

        //结束下课然后断流
        if(rtc.localStream){
            rtc.localStream.stop();
            rtc.localStream.close();
        }

        // while (rtc.remoteStreams.length > 0) {
        //     var stream = rtc.remoteStreams.shift();
        //     var id = stream.getId();
        //     var isplay=stream.isPlaying();
        //     if(isplay){
        //         stream.stop();
        //     }
        //     //removeView(id);
        // }
        rtc.localStream = null;
        //rtc.remoteStreams = [];
        //rtc.client = null;
        console.log("client end push success");

        //如果正在共享屏幕
        if(rtc.localStream_screen){
            teacherscreen.stopScreen();
        }
    }

    //进入房间后先进行各种初始化和进入房间
    function init(){
        
        /* 加入socket */
        nodejsInit();
    
        Ware.init();
        Student.init();
        Linkmic.init();
        Live.init();
        Exam.init();
        Practice.init();
        Praise.init();
        Know.init();
        Rob.init();
        Chat.init();

        //非主播直接进入
        if(_DATA.roominfo.user_type!=1){
            joinWhite();
            joinAgora();
        }
        // joinWhite();
    }
    
    /* 课件处理 */
    const Ware={
        js_ware:$('#js_ware'),
        js_ware_add:$('#js_ware_add'),
        classfile:$('.classfile'),
        init:function(){
            var _this=this;
            _this.js_ware.on('click',function(){
                _this.getWare();
            })
            
            _this.js_ware_add.on('click',function(){
                $('#upload').empty();
                var input = '<input type="file" id="ware_file" name="file" />';
                $('#upload').html(input);
                var index='ware_file';
                var iptt=document.getElementById(index);
                if(window.addEventListener) { // Mozilla, Netscape, Firefox
                    iptt.addEventListener('change',function(){
                        _this.addWare();
                    },false);
                }else{
                    iptt.attachEvent('onchange',function(){
                        _this.addWare();
                    });
                }
                $('#'+index).click();
            })
            
            _this.classfile.on('click','.js_ware_del',function(){
                var _that=$(this);
                layer.confirm('确定要删除该课件么',{},function(){
                    _this.delWare(_that);
                })
            })
            
            //点击关闭课件列表
             _this.classfile.on('click','.classfilen_top_close',function(){
                _this.classfile.hide();
            })
        },
        getWare:function(){
            $.ajax({
                type: "POST",
                url:'/teacher/liveing/getWare',
                data:{courseid:courseid,lessonid:lessonid},
                dataType:'json',
                error: function(e)
                {
                    layer.msg("网络错误");
                },
                success: function(data)
                {
                    if(data.code==0){
                        handelRes(data);
                        return !1;
                    }
                    

                    var html='';
                    var list=data.data;

                    for(var i=0;i<list.length;i++){
                        var v=list[i];
                        html+='<div class="classfilen_bottom_list_li">\
                                    <div class="classfilen_bottom_list_li_avatar">'+v.name+'</div>\
                                    <div class="classfilen_bottom_list_li_name">'+v.size+'</div>\
                                    <div class="classfilen_bottom_list_li_edit">\
                                        <a style="color:#38DAA6" target="_blank" href="'+v.url+'"><span data-url="'+v.url+'" data-name="'+v.name+'">打开</span></a>&nbsp;&nbsp;\
                                        <a style="color:#38DAA6" href="javascript:void(0)"><span data-id="'+v.id+'" class="js_ware_del">删除</span></a>\
                                    </div>\
                                </div>';
                    }
                    
                    $('.classfilen_bottom_list').html(html);
                    $('.classfile').show();
                }
            })
        },
        addWare:function(){
            var file = $('#upload').find('#ware_file')[0].files[0];
            var location=$('#upload').find('#ware_file').val();
            var point = location.lastIndexOf(".");  
            var type = location.substr(point);  

            if(type!=".ppt" && type!=".doc" && type!=".docx" && type!=".xls" && type!=".xlsx"){  
                layer.msg('课件只能上传ppt word excel');
                return !1;
            }
            var formData = new FormData(); 
            formData.append('file', file);
            formData.append('courseid', courseid);
            formData.append('lessonid', lessonid);
            
            $.ajax({ 
                url: '/teacher/liveing/addWare',
                type: 'post', 
                data: formData, 
                dataType:'json',
                cache: false, 
                processData: false, 
                contentType: false, 
                success:function(data){
                    if(data.code==0){
                        handelRes(data);
                        return !1;
                    }
                    var v=data.data;
                    var html='<div class="classfilen_bottom_list_li">\
                                    <div class="classfilen_bottom_list_li_avatar">'+v.name+'</div>\
                                    <div class="classfilen_bottom_list_li_name">'+v.size+'</div>\
                                    <div class="classfilen_bottom_list_li_edit">\
                                        <a style="color:#38DAA6" target="_blank" href="'+v.url+'"><span data-url="'+v.url+'" data-name="'+v.name+'">打开</span></a>&nbsp;&nbsp;\
                                        <a style="color:#38DAA6" href="javascript:void(0)"><span data-id="'+v.id+'" class="js_ware_del">删除</span></a>\
                                    </div>\
                                </div>';
                    
                    $('.classfilen_bottom_list').append(html);
                },
                error:function(e){
                    layer.msg("网络错误");
                }
            })
        },
        delWare:function(_that){
            var id=_that.data('id');
            
            $.ajax({
                type: "POST",
                url:'/teacher/liveing/delWare',
                data:{courseid:courseid,lessonid:lessonid,id:id},
                dataType:'json',
                error: function(e)
                {
                    layer.msg("网络错误");
                },
                success: function(data)
                {
                    if(data.code==0){
                        handelRes(data);
                        return !1;
                    }
                    layer.closeAll();
                    _that.parents('.classfilen_bottom_list_li').remove();
                }
            })
        },
        downWare:function(){
            
        }
    }

    /* 学生列表 */
    const Student={
        student_list:$('.student_list'),
        js_student_btn:$('.js_student_btn'),
        js_student_hand:$('.js_student_hand'),
        init:function(){
            var _this=this;
            _this.js_student_btn.on('click',function(){
               _this.getList();
            });
            
            //点击关闭学生列表
            _this.student_list.on('click','.studentlist_top_close',function(){
                _this.student_list.hide();
                $('.body_left_bottom_bottom_list1').show();
                $('.body_left_bottom_bottom_list2').hide();
            })
            
            /* 上下麦操作 */
            _this.student_list.on('click','.js_linkmic',function(){
                
                var _that=$(this);
                var touid=_that.parents('.studentlist_bottom_list_li').data('uid'); //用户id
                var type=_that.data('type');
                _this.Linkmic(touid,type);
            })
            
            /* 拒绝上麦 */
            _this.student_list.on('click','.js_refuse_linkmic',function(){
                var _that=$(this);
                var touid=_that.parents('.studentlist_bottom_list_li').data('uid'); //用户id
                
                var msg = '{"msg":[{"_method_":"LinkMic","uid":"'+_DATA.userinfo.id+'","avatar":"'+_DATA.userinfo.avatar+'","user_nickname":"'+_DATA.userinfo.user_nickname+'","action":"3","source":"PC","touid":"'+touid+'"}],"retcode":"000000","retmsg":"OK"}';
                Socket.emitData('broadcast',msg);
                _this.getList();
            })
            
            /* 禁言、取消禁言 */
            _this.student_list.on('click','.js_shutup',function(){
                
                var _that=$(this);
                var touid=_that.parents('.studentlist_bottom_list_li').data('uid'); //用户id
                
                var type=_that.data('type');
                _this.Shutup(_that,touid,type);
            })
            
            /* 踢人 */
            _this.student_list.on('click','.js_kick',function(){
                var _that=$(this);
                var touid=_that.parents('.studentlist_bottom_list_li').data('uid'); //用户id
                
                _this.Kick(_that,touid);
            })
            
            /* 白板授权 */
            _this.student_list.on('click','.js_write',function(){
                var _that=$(this);
                var touid=_that.parents('.studentlist_bottom_list_li').data('uid'); //用户id
                
                var type=_that.data('type');
                _this.setWrite(_that,touid,type);
            })
        },
        addHand:function(){
            var _this=this;
            _this.js_student_hand.show();
        },
        delHand:function(){
            var _this=this;
            _this.js_student_hand.hide();
        },
        getList:function(){
            var _this=this;
            _this.delHand();
            $.ajax({
                type: "POST",
                url:'/teacher/liveing/getUserLists',
                data:{courseid:courseid,lessonid:lessonid,stream:stream},
                dataType:'json',
                error: function(e)
                {
                    layer.msg("数据请求失败");
                },
                success: function(data)
                {
                    
                    if(data.code==0){
                        handelRes(data);
                        return !1;
                    }
                    
                    var html='';
                    var list=data.data.list;
                    var type_s={0:'台下',1:'台上',2:'<span style="color:#FF4F4F">举手</span>'};
                   
                        
                    for(var i=0;i<list.length;i++){
                        var v=list[i];
                        html+='<div class="studentlist_bottom_list_li" data-uid="'+v.id+'">\
                                    <div class="studentlist_bottom_list_li_avatar">\
                                        <img src="'+v.avatar+'">\
                                    </div>\
                                    <div class="studentlist_bottom_list_li_name">'+v.user_nickname+'</div>';
                        
                            html+='<div class="studentlist_bottom_list_li_status">'+type_s[v.type]+'</div>';
                            
                        if(v.type==1){
                            if(v.iswrite==1){
                                 html+='<div class="studentlist_bottom_list_li_status"><span class="write_c js_write" data-type="0">取消授权</span></div>';
                            }else{
                                 html+='<div class="studentlist_bottom_list_li_status"><span class="write_c write_a js_write" data-type="1">授权</span></div>';
                            }
                        }else{
                            html+='<div class="studentlist_bottom_list_li_status"></div>';
                        }
                        
                       
                            html+='<div class="studentlist_bottom_list_li_edit">';
                            if(v.type==2){
                                html+= '<span class="js_linkmic" data-type="1">上台</span>';
                                html+= '<span class="js_refuse_linkmic">拒绝</span>';
                            }else if(v.type==1){
                                html+= '<span class="js_linkmic" data-type="0">下台</span>';
                            }else{
                                html+= '';
                            }
                                    
                            if(v.isshut==1){
                                html+='<span  class="js_shutup" data-type="0">取消禁言</span>';
                            }else{
                                html+='<span  class="js_shutup" data-type="1">禁言</span>';
                            }
                            
                                html+='<span  class="js_kick">踢出</span>';
                            html+='</div>\
                                </div>';
                    }

                    
                    $('.studentlist_bottom_list').html(html);
                       
                    _this.student_list.show();
                    
                    
                    $('.body_left_bottom_bottom_list1').hide();
                    $('.body_left_bottom_bottom_list2').show();
                    
                    var nums=data.data.nums;
                    _this.student_list.find('.studentlist_top_nums').html(data.data.nums);
                }
            })
        },
        Shutup:function(_that,touid,type){
            var _this=this;
            $.ajax({
                type: "POST",
                url:'/teacher/liveing/setShutup',
                data:{courseid:courseid,lessonid:lessonid,stream:stream,touid:touid,type:type},
                dataType:'json',
                error: function(request)
                {
                    layer.msg("数据请求失败");
                },
                success: function(data)
                {
                    if(data.code==0){
                        handelRes(data);
                        return !1;
                    }
                    
                    let action=0;
                    if(type==1){
                        action=1;
                        _that.html('取消禁言');
                        _that.data('type','0');
                    }else{
                        _that.html('禁言');
                        _that.data('type','1');
                    }

                    
                    var msg = '{"msg":[{"_method_":"Shutup","uid":"'+_DATA.userinfo.id+'","avatar":"'+_DATA.userinfo.avatar+'","user_nickname":"'+_DATA.userinfo.user_nickname+'","action":"'+action+'","source":"PC","touid":"'+touid+'"}],"retcode":"000000","retmsg":"OK"}';
                    
                    Socket.emitData('broadcast',msg);
                }
            })
        },
        Kick:function(_that,touid){
            var _this=this;
            
            $.ajax({
                type: "POST",
                url:'/teacher/liveing/kick',
                data:{courseid:courseid,lessonid:lessonid,touid:touid},
                dataType:'json',
                error: function(request)
                {
                    layer.msg("数据请求失败");
                },
                success: function(data)
                {
                    
                    if(data.code==0){
                        handelRes(data);
                        return !1;
                    }
                    _that.parents('.studentlist_bottom_list_li').remove();

                    
                    var msg = '{"msg":[{"_method_":"Kick","action":"1","uid":"'+_DATA.userinfo.id+'","avatar":"'+_DATA.userinfo.avatar+'","user_nickname":"'+_DATA.userinfo.user_nickname+'","touid":"'+touid+'"}],"retcode":"000000","retmsg":"OK"}';
                    Socket.emitData('broadcast',msg);	
                }
            })
        },
        Linkmic:function(touid,type){
            var _this=this;
            $.ajax({
                type: "POST",
                url:'/teacher/liveing/setLinkmic',
                data:{courseid:courseid,lessonid:lessonid,stream:stream,touid:touid,type:type},
                dataType:'json',
                error: function(request)
                {
                    layer.msg("数据请求失败");
                },
                success: function(data)
                {
                    if(data.code==0){
                        handelRes(data);
                        return !1;
                    }
                    var action=5;
                    if(type==1){
                        action=2;
                    }
                    
                    var msg = '{"msg":[{"_method_":"LinkMic","uid":"'+_DATA.userinfo.id+'","avatar":"'+_DATA.userinfo.avatar+'","user_nickname":"'+_DATA.userinfo.user_nickname+'","action":"'+action+'","source":"PC","touid":"'+touid+'"}],"retcode":"000000","retmsg":"OK"}';
                    Socket.emitData('broadcast',msg);
                    
                    layer.msg(data.msg,{},function(){
                        _this.getList();
                    });
                    
                    
                }
            })
        },
        setWrite:function(_that,touid,type){
            var action=5;
            if(type==1){
                action=1;
                _that.data('type',0);
                _that.removeClass('write_a');
                _that.html('取消授权');
            }else{
                _that.data('type',1);
                _that.addClass('write_a');
                _that.html('授权');
            }
            
            var msg = '{"msg":[{"_method_":"setWhite","uid":"'+_DATA.userinfo.id+'","avatar":"'+_DATA.userinfo.avatar+'","user_nickname":"'+_DATA.userinfo.user_nickname+'","action":"'+action+'","source":"PC","touid":"'+touid+'"}],"retcode":"000000","retmsg":"OK"}';
            Socket.emitData('broadcast',msg);
        }
        
    };

    /* 连麦 */
    const Linkmic={
        list:$('.linkmic_list'),
        init:function(){
            var _this=this;
            _this.list.on('click','.mic',function(){
               var _that=$(this);
               _this.setMic(_that);
            });
            
            _this.list.on('click','.camera',function(){
               var _that=$(this);
               _this.setCamera(_that);
            });
        },
        listToggle:function(type=0){
            var _this=this;
            
            if(type==1){
                _this.list.show();
            }else{
                _this.list.hide();
            }
            refreshViewSize();
        },
        upSize:function(){
            var _this=this;
            var list_w=_this.list.width();
            var max=Math.floor(list_w/200);
            
            var list_li=_this.list.find(".list_li");
            var nums=list_li.length;
            
            if(nums<max){
                list_li.css({'width':'200px'});
            }else{
                var w_n=Math.floor(list_w/nums);
                if(w_n<100){
                    list_li.css({'width':'100px'});
                }else{
                    list_li.css({'width': w_n+'px'});
                }
                
            }
            
        },
        //获取连麦的一些信息
        getLinkInfo:function(id,remoteStream){
            var _this=this;
            //拿着用户的id获取信息去
            $.ajax({
                type: "POST",
                url:'/teacher/liveing/getLinkInfo',
                data:{id:id},
                dataType:'json',
                error: function(request)
                {
                    layer.msg("数据请求失败");
                },
                success: function(data)
                {
                    if(data.code==0){
                        handelRes(data);
                        return !1;
                    }
                    var userinfo=data.data;
                    _this.addView(id,userinfo.user_nickname,remoteStream);
                }
            })
        },
        addView:function(touid,name,remoteStream){
            var _this=this;
            
            var touid_div=_this.list.find("#linkmic_"+touid);
            if(!touid_div.length){
                var html='<div class="list_li"  id="linkmic_'+touid+'" data-uid="'+touid+'">\
                            <div class="list_li_bg"></div>\
                            <div class="list_li_name">'+name+'</div>\
                            <div class="list_li_play"></div>\
                            <div class="list_li_c">\
                                <span class="mic on"></span>\
                                <span class="camera on"></span>\
                            </div>\
                        </div>';

                _this.list.append(html);
            }
            
            var list_li=_this.list.find(".list_li");
            var nums=list_li.length;
            if(nums==1){
                _this.listToggle(1);
            }
            
            _this.upSize();
            if(remoteStream){
                var _that=_this.list.find("#linkmic_"+touid);
                remoteStream.play("linkmic_"+touid,{fit: "contain"},function(errState){
                    var isPlay=checkBrowser.myBrowser();
                    if (errState && errState.status !== "aborted" && isPlay==false){
                        top.layer.msg('由于浏览器的限制，需要手动点击学生画面进入播放');
                        _that.find('.list_li_play').show();
                        _that.onclick=function(){
                            remoteStream.resume().then(
                                function (result) {
                                    _that.find('.list_li_play').hide();
                                    _that.find("#player_"+touid).css({'position':'absolute','top':'0'});
                                    console.log('恢复成功：' + result);
                                }).catch(
                                function (reason) {
                                    layer.msg('播放失败，建议使用最新谷歌浏览器');
                                    console.log('恢复失败：' + reason);
                            });
                        }
                    }else{
                        _that.find("#player_"+touid).css({'position':'absolute','top':'0'});
                    }
                });
            }
        },
        delView:function(touid){
            var _this=this;
            var touid_div=_this.list.find("#linkmic_"+touid);
            if(touid_div.length){
                touid_div.remove();
            }
            var list_li=_this.list.find(".list_li");
            var nums=list_li.length;
            if(!nums){
                _this.listToggle();
                return 1;
            }
            
            _this.upSize();
        },
        setMic:function(_that){
            var action=0;
            var touid=_that.parents('.list_li').data('uid');
            if(_that.hasClass('on')){
                _that.removeClass('on');
                action=1;
            }else{
                _that.addClass('on');
                action=2;
            }
            
            var msg = '{"msg":[{"_method_":"setLiveModel","uid":"'+_DATA.userinfo.id+'","action":"'+action+'","ct":"","source":"PC","touid":"'+touid+'"}],"retcode":"000000","retmsg":"OK"}';
            Socket.emitData('broadcast',msg);
            
            /* for(var i=0;i<rtc.remoteStreams.length;i++){
                if(rtc.remoteStreams[i].getId()==touid){ //音频轨道处理
                    if(action==1){
                        rtc.remoteStreams[i].unmuteAudio();
                    }
                    if(action==2){
                        rtc.remoteStreams[i].muteAudio();
                    }
                    
                }
            } */
        },
        setCamera:function(_that){
            var action=0;
            var touid=_that.parents('.list_li').data('uid');
            if(_that.hasClass('on')){
                _that.removeClass('on');
                _that.parents('.list_li').find('.list_li_bg').addClass('on');
                action=3;
            }else{
                _that.addClass('on');
                _that.parents('.list_li').find('.list_li_bg').removeClass('on');
                action=4;
            }

            var msg = '{"msg":[{"_method_":"setLiveModel","uid":"'+_DATA.userinfo.id+'","action":"'+action+'","ct":"","source":"PC","touid":"'+touid+'"}],"retcode":"000000","retmsg":"OK"}';
            Socket.emitData('broadcast',msg);
            
            /* for(var i=0;i<rtc.remoteStreams.length;i++){
                if(rtc.remoteStreams[i].getId()==touid){ //视频轨道处理
                    if(action==3){
                        rtc.remoteStreams[i].unmuteVideo();
                    }
                    if(action==4){
                        rtc.remoteStreams[i].muteVideo();
                    }
                    
                }
            } */
        }
    };

    /* 直播 */
    const Live={
        live_issubmit:0,
        live_start:$('.live_start'),
        live_resume:$('.live_resume'),
        live_end:$('.live_end'),
        live_later:$('.live_later'),
        islocalstream:0,
        init:function(){
            var _this=this;

            /* 上课时长计时 */
            if(_DATA.roominfo.islive==1){
                timeInterval.classInterval(_DATA.roominfo.start_length);
            }
            _this.live_start.on('click',function(){
                var _that=$(this);

                if(!_this.islocalstream){
                    layer.msg('请等待右侧出现画面再操作');
                    return !1;
                }

                if(_that.data('status')==1){
                    return !1;
                }
                _that.data('status','1');
                _this.start();
            })
            
            _this.live_resume.on('click',function(){
               var _that=$(this);

                if(!_this.islocalstream){
                    layer.msg('请等待右侧出现画面再操作');
                    return !1;
                }

                if(_that.data('status')==1){
                    return !1;
                }
                _that.data('status','1');
                _this.startLive();
            })
            
            _this.live_end.on('click',function(){
                var _that=$(this);
                if(_that.data('status')==1){
                    return !1;
                }
                _that.data('status','1');
                _this.end();
            })
            
        },
        clear:function(){
            var _this=this;
            _this.live_start.data('status',0);
            _this.live_resume.data('status',0);
            _this.live_end.data('status',0);
        },
        start:function(){
            var _this=this;
            if(_this.live_issubmit){
                return !1;
            }
            
            if(!selectedMicrophoneId || !selectedCameraId || selectedMicrophoneId=='' || selectedCameraId==''){
                layer.msg('请检查麦克风和摄像头是否正常');
                return !1;
            }
            _this.live_issubmit=1;
            $.ajax({
                type: "POST",
                url:'/teacher/liveing/startlive',
                data:{courseid:courseid,lessonid:lessonid},
                dataType:'json',
                error: function(e)
                {
                    _this.live_issubmit=0;
                    layer.msg("数据请求失败");
                },
                success: function(data)
                {
                    _this.live_issubmit=0;
                    if(data.code==0){
                        handelRes(data);
                        return !1;
                    }
                    timeInterval.classInterval(0);
                    _this.startLive();
                }
            })
        },
        end:function(){
            var _this=this;
            if(_this.live_issubmit){
                return !1;
            }
            var endclass=layer.confirm(' 下课后，本堂课无法在继续上课，是否确认下课', {
                title:'提示',
                btn: ['是','否'] //按钮
            }, function(){
                layer.close(endclass);
                
                _this.live_issubmit=1;
                
                $.ajax({
                    type: "POST",
                    url:'/teacher/liveing/endlive',
                    data:{courseid:courseid,lessonid:lessonid},
                    dataType:'json',
                    error: function(request)
                    {
                        _this.live_issubmit=0;
                        layer.msg("数据请求失败");
                    },
                    success: function(data)
                    {
                        _this.live_issubmit=0;
                        if(data.code==0){
                            handelRes(data);
                            return !1;
                        }
                        
                        var msg = '{"msg":[{"_method_":"StartEndLive","action":"18"}],"retcode":"000000","retmsg":"OK"}';
                        Socket.emitData('broadcast',msg);	
                        
                        layer.msg(data.msg,{},function(){
                            location.href='/teacher/course/lesson?courseid='+courseid;
                        });  
                    }
                })
            }, function(){
           

            });
        },
        startLive:function(){
            joinAgora(1);
        }
        
    };

    const select_list=['A','B','C','D','E','F','G','H','I','J','K','L','M','N'];
    const select_color=['#38DAD0','#FFAD31','#FF6825','#3B85F3','#38DAA6','#38DAD0','#FFAD31','#FF6825','#3B85F3','#38DAA6','#38DAD0','#FFAD31','#FF6825','#3B85F3'];
    const type_list=['判断题','单选题','定项多选题','简答题','填空题','不定项多选题'];
    /* 测 */
    const Exam={
        js_exam:$('.js_exam'),
        exam_send:$('.exam_send'),
        exam_result:$('.exam_result'),
        exam_user:$('.exam_user'),
        exam_type:1,
        exam_nums:1,
        exam_rs:'',
        exam_rs_list:[],
        exam_rs_nums:{},
        layer_user:null,
        init:function (){
            var _this=this;
            /* 打开测试 */
            _this.js_exam.on('click',function(){
                _this.setExam();
                _this.exam_send.show();
            })
            /* 关闭测试 */
            _this.exam_send.on('click','.exam_send_no',function(){
                _this.exam_send.hide();
            })
            /* 切换类型 */
            _this.exam_send.on('click','.exam_type',function(){
                var _that=$(this);
                if(_that.hasClass('on')){
                    return !1;
                }
                _that.siblings().removeClass('on');
                _that.addClass('on');
                var type=_that.data('type');
                _this.exam_type=type;
                _this.setExam();
            })
            /* 选择答案 */
            _this.exam_send.on('click','.exam_select span[data-value]',function(){
                var _that=$(this);
                if(_that.hasClass('on')){
                    if(_this.exam_type==2){
                        _that.removeClass('on');
                    }
                    return !1;
                }
                if(_this.exam_type!=2) {
                    _that.siblings().removeClass('on');
                }
                _that.addClass('on');
            })
            /* 添加选项 */
            _this.exam_send.on('click','.select_add',function(){
                _this.addSelect();
            })

            /* 去除选项 */
            _this.exam_send.on('click','.select_del',function(){
                _this.delSelect();
            })

            /* 发布测试 */
            _this.exam_send.on('click','.exam_send_ok',function(){
                _this.sendExam();
            })

            /* 查看详情 */
            _this.exam_result.on('click','.exam_rs_ok',function(){
                _this.showList();
            })

            /* 关闭详情 */
            _this.exam_user.on('click','.exam_user_close',function(){
                layer.close(_this.layer_user);
            })

            /* 结束测试 */
            _this.exam_result.on('click','.exam_rs_no',function(){
                _this.endExam();
            })
        },
        setExam:function (){
            var _this=this;
            var type=_this.exam_type;
            var html='';
            if(type==0){
                html='<span class="select_j" data-value="1">对</span>\n' +
                    '<span class="select_j" data-value="0">错</span>';
            }

            if(type==1 || type==2){
                html='<span class="select_s" data-value="0">A</span>\n' +
                    ' <span class="select_s" data-value="1">B</span>\n' +
                    ' <span class="select_s" data-value="2">C</span>\n' +
                    ' <span class="select_s" data-value="3">D</span>\n' +
                    ' <span class="select_add">+</span>';
            }
            _this.exam_send.find('.exam_select').html(html);
        },
        addSelect:function(){
            var _this=this;
            var nums=_this.exam_send.find('.exam_select span[data-value]').length;
            var name=select_list && select_list[nums] ? select_list[nums] : '';
            if(!name){
                return !1;
            }
            var html='<span class="select_s" data-value="'+nums+'">'+name+'</span>\n';
            _this.exam_send.find('.exam_select .select_add').before(html);

            if(nums==4){
                var html2='<span class="select_del">-</span>\n';
                _this.exam_send.find('.exam_select .select_add').after(html2);
            }
        },
        delSelect:function(){
            var _this=this;
            var nums=_this.exam_send.find('.exam_select span[data-value]').length;
            if(nums<=4){
                return !1;
            }
            _this.exam_send.find('.exam_select span[data-value]').eq(-1).remove();
            if(nums==5){
                _this.exam_send.find('.exam_select .select_del').remove();
            }
        },
        sendExam:function(){
            var _this=this;
            var type=_this.exam_type;
            var nums=2;
            var rs='';
            var list=_this.exam_send.find('.exam_select span.on');
            if(!list.length){
                layer.msg('请点击设置正确选项');
                return  !1;
            }
            var rs_a=[];
            if(type==0){
                var value=_this.exam_send.find('.exam_select span.on').data('value');
                rs_a.push(value.toString());
            }
            if(type==1){
                nums=_this.exam_send.find('.exam_select span[data-value]').length;
                var value=_this.exam_send.find('.exam_select span.on').data('value');
                rs_a.push(value.toString());
            }
            if(type==2){
                nums=_this.exam_send.find('.exam_select span[data-value]').length;

                _this.exam_send.find('.exam_select span.on').each(function(){
                    var _that2=$(this);
                    var value=_that2.data('value');
                    rs_a.push(value.toString());
                })

            }
            _this.exam_nums=nums;
            _this.exam_rs=rs_a;
            _this.exam_rs_list=[];
            rs=rs_a.join(',');

            _this.exam_rs_nums=[];
            for(var i=0;i<nums;i++){
                _this.exam_rs_nums[i]=0;
            }

            _this.showResult();
            var msg = '{"msg":[{"_method_":"exam","action":"1","source":"PC","type":"'+type+'","nums":"'+nums+'","rs":"'+rs+'"}],"retcode":"000000","retmsg":"OK"}';
            Socket.emitData('broadcast',msg);
        },
        showResult:function(){
            var _this=this;
            _this.exam_send.hide();
            var type=_this.exam_type;
            var nums=_this.exam_nums;
            var type_name='';
            var html='';
            if(type==0){
                type_name='判断题';
                html='<div class="exam_column" data-value="1">\n' +
                    '    <div class="exam_column_bd">\n' +
                    '       <div class="exam_column_bd_t">0%</div>\n' +
                    '       <div class="exam_column_bd_p" style="background: #38DAD0;"></div>\n' +
                    '    </div>\n' +
                    '    <div class="exam_column_t">对</div>\n' +
                    '</div>' +
                    '<div class="exam_column" data-value="0">\n' +
                    '    <div class="exam_column_bd">\n' +
                    '       <div class="exam_column_bd_t">0%</div>\n' +
                    '        <div class="exam_column_bd_p" style="background: #FFAD31;"></div>\n' +
                    '    </div>\n' +
                    '    <div class="exam_column_t">错</div>\n' +
                    '</div>';
            }
            if(type==1){
                type_name='单选题';
            }
            if(type==2){
                type_name='多选题';
            }
            if(type==1|| type==2){
                for(var i=0;i<nums;i++){
                    html+='<div class="exam_column" data-value="'+i+'">\n' +
                        '    <div class="exam_column_bd">\n' +
                        '       <div class="exam_column_bd_t">0%</div>\n' +
                        '       <div class="exam_column_bd_p" style="background: '+select_color[i]+';"></div>\n' +
                        '    </div>\n' +
                        '    <div class="exam_column_t">'+select_list[i]+'</div>\n' +
                        '</div>';
                }
            }
            _this.exam_result.find('.exam_rs_t span').html(0);
            _this.exam_result.find('.exam_type').html(type_name);
            _this.exam_result.find('.exam_rs').html(html);

            _this.exam_result.show();
        },
        upResult:function (data){
            if(_DATA.roominfo.user_type!=1){
                return !1;
            }
            var _this=this;
            var type=_this.exam_type;
            var rs=[];
            var result=data.result;
            if(type==0){
                rs.push(result.toString());
            }

            if(type==1 || type==2){
                var result_a=result.split(',');
                rs=result_a;
            }

            var list_a={
                'uid':data.uid,
                'name':data.user_nickname,
                'rs':rs,
            };
            _this.exam_rs_list.push(list_a);

            for(var i=0;i<rs.length;i++){
                var t=rs[i];
                _this.exam_rs_nums[t]+=1;
            }
            var nums=_this.exam_rs_list.length;

            if(nums<1){
                return !1;
            }

            _this.exam_result.find('.exam_rs_t span').html(nums);

            var num_list=_this.exam_rs_nums;
            for(var i in num_list){
                var rs_num=num_list[i];
                var pre=Math.floor(rs_num*100/nums);
                var obj=_this.exam_result.find('.exam_column[data-value='+i+']');
                obj.find('.exam_column_bd_t').html(pre+'%').css({'bottom':pre+'%'});
                obj.find('.exam_column_bd_p').css({'height':pre+'%'});
            }

        },
        showList:function(){
            var _this=this;
            var list=_this.exam_rs_list;
            var rs=_this.exam_rs;
            var type=_this.exam_type;
            var html='';
            for(var i=0;i<list.length;i++){
                var v=list[i];
                var no=i+1;
                var result=v.rs;
                var rs_s='';

                for(var m=0;m<result.length;m++){
                    var v2=result[m];
                    var css='';
                    if($.inArray(v2,rs)>=0){
                        css='on';
                    }
                    if(type==0){
                        var name='错';
                        if(v2==1){
                            name='对';
                        }
                        rs_s+='<span class="'+css+'">'+name+'</span>';
                    }else{
                        rs_s+='<span class="'+css+'">'+select_list[v2]+'</span>';
                    }

                }

                html+='<li>\n' +
                    '     <div class="exam_user_list_t1">'+no+'</div>\n' +
                    '     <div class="exam_user_list_t2">'+v.name+'</div>\n' +
                    '     <div class="exam_user_list_t3">'+rs_s+'</div>\n' +
                    '     <div class="exam_user_list_t4 praise" data-uid="'+v.uid+'" data-name="'+v.name+'">表扬</div>\n' +
                    '</li>';
            }
            _this.exam_user.find('ul').html(html);
            //_this.exam_user.show();
            _this.layer_user=layer.open({
                type: 1,
                title:false,
                closeBtn:0,
                area: ['600px', '500px'],
                content: _this.exam_user
            });

        },
        endExam:function(){
            var _this=this;
            _this.exam_send.hide();
            _this.exam_result.hide();
            var msg = '{"msg":[{"_method_":"exam","action":"0","source":"PC"}],"retcode":"000000","retmsg":"OK"}';
            Socket.emitData('broadcast',msg);
        }
    };
    /* 练 */
    const Practice={
        js_practice:$('.js_practice'),
        practice_send:$('.practice_send'),
        practice_result:$('.practice_result'),
        practice_user:$('.practice_user'),
        practice_time:$('#practice_time'),
        practice_add:$('.practice_add'),
        question_add:$('.question_add'),
        add_type:$('#add_type'),
        add_count:$('#add_count'),
        add_nums:$('#add_nums'),
        add_score:$('#add_score'),
        add_score2:$('#add_score2'),
        add_score3:$('#add_score3'),
        add_select:$('#add_select'),
        js_practice_add:$('.js_practice_add'),
        js_practice_no:$('.js_practice_no'),
        practice_add_bd:$('.practice_add_bd'),
        practice_nums:$('#practice_nums'),
        practice_score:$('#practice_score'),
        practice_list_bd:$('.practice_list_bd'),
        practice_send_no:$('.practice_send_no'),
        practice_send_ok:$('.practice_send_ok'),
        practice_save:$('.practice_save'),
        practice_timeing:$('#practice_timeing'),
        practice_stop:$('.practice_stop'),
        result_ok:$('.result_ok'),
        result_no:$('.result_no'),
        practice_rs_nums:$('#practice_rs_nums'),
        practice_ing:$('#practice_ing'),
        practice_end:$('#practice_end'),
        practice_rs_bd:$('.practice_rs_bd'),
        question_show:$('.question_show'),
        practice_bd_t:$('.practice_bd_t'),
        tab_bd:$('.tab_bd'),
        draft_list:$('.draft_list'),
        draft_send:$('.draft_send'),
        draft_title:$('#draft_title'),
        timer:null,
        echart:null,
        layer_user:null,
        total_nums:0,
        total_score:0,
        practice_list:[],
        draft:[],
        issub:0,
        type:0,
        q:{},
        q_a:[],
        init:function (){
            var _this=this;
            Q_select.init(_this,_this.getType);
            Question.init(_this,_this.getSelect);
            _this.js_practice.on('click',function (){
                //_this.showSend();
                if(!$(this).hasClass('on')){
                    Q_select.show();
                }
            })
            _this.practice_add.on('click',function (){
                _this.setSend();
            })

            _this.question_add.on('click',function (){
                Question.show(_this.q);
            })
            _this.add_type.change(function (){
                var _that=$(this);
                var type=_that.val();
                if(type==0 || type==4){
                    _this.add_select.hide();
                }else{
                    _this.add_select.show();
                }

                if(type==4){
                    _this.practice_add_bd.find('.add_score_1').hide();
                    _this.practice_add_bd.find('.add_score_2').show();
                }else{
                    _this.practice_add_bd.find('.add_score_1').show();
                    _this.practice_add_bd.find('.add_score_2').hide();
                }

                if(type==5){
                    _this.practice_add_bd.find('.add_score_3').show();
                }else{
                    _this.practice_add_bd.find('.add_score_3').hide();
                }
            })
            _this.js_practice_add.on('click',function (){
                _this.addTopic();
            })
            _this.js_practice_no.on('click',function (){
                _this.practice_add_bd.hide();
            })
            _this.practice_list_bd.on('click','span',function (){
                var _that=$(this);
                if(_this.type==1){
                    return !1;
                }
                var span_p=_that.parent();
                var type=span_p.data('type');
                if(_that.hasClass('on')){
                    if(type==2 || type==5){
                        _that.removeClass('on');
                        _this.upRs(_that);
                    }
                    return !1;
                }
                if(type!=2 && type!=5) {
                    _that.siblings().removeClass('on');
                }
                _that.addClass('on');
                _this.upRs(_that);
            })
            _this.practice_list_bd.on('click','.after',function (){
                var _that=$(this);
                var index=_that.parent().index();
                _this.delTopic(index);
            })

            _this.practice_list_bd.on('click','.input_add',function (){
                _this.addIput($(this));
            })

            _this.practice_list_bd.on('click','.input_del',function (){
                _this.delInput($(this));
            })

            _this.practice_list_bd.on('input propertychange','.input_bd textarea',function (){
                _this.upInput($(this));
            })

            _this.practice_send.on('click','.practice_send_close',function(){
                _this.practice_send.hide();
                _this.question_show.hide();
                _this.js_practice.removeClass('on');
                _this.clear();
            })
            _this.practice_send_ok.on('click',function(){
                _this.sendPractice();
            })
            _this.practice_send_no.on('click',function(){
                layer.confirm('确定要清除答题卡么',function(index){
                    layer.close(index);
                    _this.clear();
                })
            })
            _this.practice_stop.on('click',function(){
                _this.stop();
            })
            _this.result_ok.on('click',function(){
                _this.end();
            })
            _this.result_no.on('click',function(){
                _this.showUser();
            })
            _this.practice_user.on('click','.exam_user_close',function(){
                layer.close(_this.layer_user);
            })

            _this.question_show.on('click','.q_s_del',function (){
                let _that=$(this);
                let li=_that.parents('li');
                let id=li.data('id');
                let index=li.index();
                _this.delSelect(index,id);
            })

            _this.practice_bd_t.on('click','span',function (){
                let _that=$(this);
                if(_that.hasClass('on')){
                    return !1;
                }
                _that.siblings('span').removeClass('on');
                _that.addClass('on');
                let index=_that.index();
                _this.tab_bd.hide().eq(index).css({'display':'flex'});
                if(index==1){
                    _this.getDraft();
                }
            })

            _this.draft_list.on('click','.d_del',function (){
                _this.delDraft($(this));
            })

            _this.practice_save.on('click',function (){
                _this.setDraft();
            })

            _this.draft_send.on('click',function (){
                _this.sendDraft();
            })
        },
        getType:function (type){
            let _this=this;
            _this.type=type;
            _this.showSend();
        },
        getSelect:function (q_select){
            let _this=this;
            _this.q=$.extend(_this.q,q_select);
            for(let k in q_select){
                _this.q_a.push(q_select[k]);
            }
            Question.close();
            _this.upSelect();
        },
        showSend:function () {
            let _this=this;
            let type=_this.type;
            if(type==1){
                _this.practice_add.hide();
                _this.question_add.show();
                _this.question_show.show();
            }else{
                _this.practice_add.show();
                _this.question_add.hide();
                _this.question_show.hide();
            }
            _this.js_practice.addClass('on');
            _this.practice_send.show();
        },
        setSend:function (){
            var _this=this;
            _this.practice_add_bd.show();
        },
        addTopic:function (){
            var _this=this;
            var type=_this.add_type.val();
            var count=_this.add_count.val();
            var nums=_this.add_nums.val();
            var score=_this.add_score.val();
            var score2=_this.add_score2.val();
            var score3=_this.add_score3.val();
            if(type==0){
                nums='2';
            }
            if(type==4){
                nums='1';
            }
            if(count<1){
                layer.msg('请填写题数');
                return !1;
            }
            if(nums<1){
                layer.msg('请填写选项数');
                return !1;
            }
            if(type==4){
                score=score2;
            }

            if(type==5){
                score2=score3;
                if(score2<=0){
                    layer.msg('请填写分数');
                    return !1;
                }
            }

            if(score<=0){
                layer.msg('请填写分数');
                return !1;
            }


            for(var i=0;i<count;i++){
                var data={
                    type:type,
                    nums:nums,
                    score:score,
                    score2:score2,
                    rs:'',
                    rs_a:[]
                };
                _this.practice_list.push(data);
            }
            _this.upTopic();

        },
        upTopic:function (){
            let _this=this;
            let list=cloneObject(_this.practice_list);
            let html='';
            for(let i=0;i<list.length;i++){
                let num=i+1;
                let v=list[i];
                let type=v.type;
                let rs=v.rs;
                let select='';
                if(type==0){
                    //判断
                    let rs_a=rs.split(',');
                    let css1='';
                    let css0='';
                    if($.inArray('0',rs_a)>=0){
                        css0='on';
                    }
                    if($.inArray('1',rs_a)>=0){
                        css1='on';
                    }
                    select+='<span class="'+css1+'" data-value="1">对</span><span class="'+css0+'" data-value="0">错</span>';
                }else if(type==4){
                    //填空题
                    let rs_a=v.rs_a;

                    for(let m=0;m<v.nums;m++){
                        let name=rs_a && rs_a[m] ? rs_a[m] : '';
                        select+='<div class="input_bd">';
                        select+='<textarea placeholder="如有多个答案，需换行填写">'+name+'</textarea>';
                        if(m!=0){
                            select+='<i class="input_del"></i>';
                        }
                        select+='</div>';
                    }
                    select+='<div class="input_add">添加填空</div>';
                }else{
                    //选择
                    let rs_a=rs.split(',');
                    for(let m=0;m<v.nums;m++){
                        let css='';
                        if($.inArray(m+'',rs_a)>=0){
                            css='on';
                        }
                        let name=select_list && select_list[m] ? select_list[m] : '';
                        select+='<span class="'+css+'" data-value="'+m+'">'+name+'</span>';
                    }
                }
                html+='<li class="practice_li">\n' +
                    '    <div>'+num+'</div>\n' +
                    '    <div data-type="'+type+'">'+select+'</div>\n' +
                    '    <i class="after"></i>\n' +
                    '    <div>'+v.score+'</div>\n' +
                    '</li>';

            }
            _this.practice_list_bd.find('ul').html(html);
            _this.upScore();
        },
        delTopic:function (index){
            var _this=this;
            _this.practice_list.splice(index,1);
            _this.upTopic();
        },
        addIput:function (_that){
            let _this=this;
            let p_li=_that.parents('.practice_li');
            let p=_that.parent();
            let html='<div class="input_bd">' +
                '   <textarea placeholder="如有多个答案，需换行填写"></textarea>' +
                '   <i class="input_del"></i>' +
                '</div>';
            _that.before(html);

            let nums=p.find('.input_bd').length;
            let index=p_li.index();
            _this.upNums(index,nums);
        },
        delInput:function (_that){
            let _this=this;
            let p_li=_that.parents('.practice_li');
            _that.parent().remove();

            let nums=p_li.find('.input_bd').length;
            let index=p_li.index();
            _this.upNums(index,nums);
        },
        upInput:function(_that){
            let _this=this;
            let v=_that.val();
            let index=_that.parents('.practice_li').index();
            let index_t=_that.parent().index();
            _this.practice_list[index].rs_a[index_t]=v;
        },
        delSelect:function (index,id){
            let _this=this;
            _this.q_a.splice(index,1);
            delete _this.q[id];
            _this.upSelect();
        },
        upSelect:function (){
            let _this=this;
            let list=cloneObject(_this.q_a);
            let html='';
            let html_ans='';
            let num=0;
            let score=0;
            //for(let k in list){
            for(let k=0;k<list.length;k++){
                let v=list[k];
                let type=v.type;
                num=num+1;
                let rs=v.answer.rs;
                let select='';
                let select2='';
                score=score+Number(v.score);
                if(type==0){
                    //判断
                    let rs_a=rs.split(',');
                    if($.inArray('0',rs_a)>=0){
                        select+='<span class="on" data-value="0">错</span>';
                    }
                    if($.inArray('1',rs_a)>=0){
                        select+='<span class="on" data-value="1">对</span>';
                    }
                }else if(type==4){
                    //填空题
                    let rs_a=v.answer.ans;

                    for(let m=0;m<rs_a.length;m++){
                        let v2=rs_a[m];
                        select+='<div class="input_ls"><i>'+(m+1)+'</i><div class="input_ls_a">';
                        for(let n=0;n<v2.length;n++){
                            let v3=v2[n];
                            select+='<div>'+v3+'</div>';
                        }
                        select+='</div>';
                        select+='</div>';
                    }
                }else{
                    //选择
                    let rs_a=rs.split(',');
                    for(let m=0;m<rs_a.length;m++){
                        let n=rs_a[m];
                        let name=select_list && select_list[n] ? select_list[n] : '';
                        select+='<span class="on" data-value="'+m+'">'+name+'</span>';
                    }

                    let ans=v.answer.ans;
                    for(let m=0;m<ans.length;m++){
                        let name=select_list && select_list[m] ? select_list[m] : '';
                        select2+='<div class="li_item">'+name+'.'+ans[m]+'</div>';
                    }
                }
                html_ans+='<li class="practice_li">\n' +
                    '    <div>'+num+'</div>\n' +
                    '    <div data-type="'+type+'">'+select+'</div>\n' +
                    '    <div>'+Number(v.score)+'</div>\n' +
                    '</li>';

                html+='<li data-id="'+v.id+'">\n' +
                    '                <div class="li_l">\n' +
                    '                    <div class="li_l_t">'+num+'.<span>'+type_list[type]+'</span> '+v.title+'</div>\n' +
                        select2 +
                    '                </div>\n' +
                    '                <div class="li_r">\n' +
                    '                    <span class="q_s_del"></span>\n' +
                    '                </div>\n' +
                    '            </li>';
            }

            _this.question_show.find('ul').html(html);
            _this.practice_list_bd.find('ul').html(html_ans);


            _this.total_score=score;
            _this.total_nums=num;
            _this.practice_nums.html(num);
            _this.practice_score.html(score);
        },
        upNums:function (index,nums){
            let _this=this;
            let list=cloneObject(_this.practice_list);
            let v=list[index];
            let score=v.score;
            if(v.type==4){
                score=Number(v.score2) * nums;
                v.nums=''+nums;
                v.score=''+score;
            }

            _this.practice_list[index]=v;
            _this.upScore();

            _this.practice_list_bd.find('.practice_li').eq(index).find('>div:last-child').html(score);
        },
        upScore:function (){
            let _this=this;
            let list=cloneObject(_this.practice_list);
            let practice_nums=list.length;
            let practice_score=0;
            for(let i=0;i<practice_nums;i++){
                let v=list[i];
                practice_score=Number(practice_score)+Number(v.score);
            }

            _this.total_score=practice_score;
            _this.total_nums=practice_nums;
            _this.practice_nums.html(practice_nums);
            _this.practice_score.html(practice_score);
        },
        upRs:function (span){
            var _this=this;
            var span_p=span.parent();
            var index=span.parent().parent().index();
            var type=span_p.data('type');
            var rs='';

            var list=span_p.find('span.on');
            if(!list.length){
                _this.practice_list[index].rs=rs;
                return !1;
            }
            var rs_a=[];
            if(type==0){
                var value=span_p.find('span.on').data('value');
                rs_a.push(value);
            }
            if(type==1){
                var value=span_p.find('span.on').data('value');
                rs_a.push(value);
            }
            if(type==2 || type==5){
                span_p.find('span.on').each(function(){
                    var _that2=$(this);
                    var value=_that2.data('value');
                    rs_a.push(value);
                })

            }

            rs=rs_a.join(',');
            _this.practice_list[index].rs=rs;
        },
        clear:function (){
            var _this=this;
            _this.q=[];
            _this.q_a=[];
            _this.practice_list=[];

            _this.total_nums=0;
            _this.total_score=0;

            _this.practice_list_bd.find('ul').html('');
            _this.question_show.find('ul').html('');
            _this.practice_nums.html(0);
            _this.practice_score.html(0);

            _this.practice_bd_t.find('span')[0].click();
        },
        check:function (){
            let _this=this;
            let content=[];
            let answer=[];

            let time=Number(_this.practice_time.val());
            if(!time || time<0){
                layer.msg('请设置答题时间');
                return !1;
            }

            time=time*60;

            if(_this.type==1){
                let list=cloneObject(_this.q_a);
                let nums=list.length;
                if(nums==0){
                    layer.msg('请先添加习题');
                    return !1;
                }

                for(let i=0;i<nums;i++){
                    let v=list[i];
                    let rs=''+v.answer.rs;
                    let ans=v.answer.ans;
                    if(v.type==4){
                        rs=ans;
                        ans=[];
                    }
                    let data={
                        type:''+v.type,
                        nums:''+v.answer.nums,
                        score:''+Number(v.score),
                        score2:''+Number(v.score2),
                        rs:rs
                    };

                    answer.push(data);
                    let data2={
                        type:''+v.type,
                        title:''+v.title,
                        ans:ans
                    };
                    content.push(data2);
                }

                _this.practice_list=cloneObject(answer);
            }else{
                let list=cloneObject(_this.practice_list);
                let nums=list.length;
                if(nums==0){
                    layer.msg('请先添加习题');
                    return !1;
                }
                for(let i=0;i<nums;i++){
                    let v=list[i];
                    let type=v.type;
                    if(type==4){
                        let nums=v.nums;
                        if(nums > v.rs_a.length){
                            layer.msg('所有习题请设置正确答案');
                            return !1;
                        }
                        let rs=[];
                        for(let i=0;i<nums;i++){
                            let name=v.rs_a && v.rs_a[i] ? v.rs_a[i] : '';
                            if(name==''){
                                layer.msg('所有习题请设置正确答案');
                                return !1;
                            }
                            let rs_a=name.split('\n');

                            let r = rs_a.filter(function (s) {
                                return s && s.trim();
                            });
                            rs.push(r);
                        }

                        v.rs=rs;
                        list[i]=v;
                    }
                    if(v.rs==''){
                        layer.msg('所有习题请设置正确答案');
                        return !1;
                    }
                }

                for(let i=0;i<nums;i++){
                    let v=list[i];
                    delete v.rs_a;
                    list[i]=v;
                }

                answer=cloneObject(list);
            }

            return {time:''+time,content:content,answer:answer};
        },
        sendPractice:function (){
            let _this=this;

            let res=_this.check();
            if(!res){
                return !1;
            }

            if(_this.issub){
                return !1;
            }

            if(_this.type==1){
                _this.question_show.find('.q_s_del').remove();
            }
            _this.send(_this.type,res.time,res.content,res.answer);
        },
        send:function (type,time,content=[],answer=[]){
            let _this=this;

            let list2=JSON.stringify(answer);
            let content2=JSON.stringify(content);

            let list3=cloneObject(answer);
            for(let i=0;i<list3.length;i++){
                let v=list3[i];
                delete v.rs;
                delete v.score2;
                list3[i]=v;
            }
            list3=JSON.stringify(list3);

            _this.issub=1;
            $.ajax({
                url:'/teacher/liveing/setPracticeList',
                type:'POST',
                data:{courseid:courseid,lessonid:lessonid,list:list2,content:content2},
                dataType:'json',
                error:function(e){
                    _this.issub=0;
                },
                success:function(data){
                    _this.issub=0;
                    if(data.code==0){
                        handelRes(data);
                        return !1;
                    }

                    _this.setTimer(time);
                    _this.showResult();

                    let msg={
                        'msg':[
                            {
                                '_method_':'practice',
                                'action':'1',
                                'type':''+type,
                                'q':JSON.stringify(content),
                                'times':time,
                                'list':list3,
                                'source':'PC'
                            }
                        ],
                        'retcode':'000000',
                        'retmsg':'OK'
                    };

                    Socket.emitData('broadcast',JSON.stringify(msg));
                }
            })

        },
        showResult:function (){
            var _this=this;

            var list=cloneObject(_this.practice_list);
            var html='';
            for(var i=0;i<list.length;i++){
                var v=list[i];
                var n=i+1;
                var span='';
                var type=v.type;
                var rs=v.rs;
                if(type==0){
                    if(rs==1){
                        span='对';
                    }else{
                        span='错';
                    }
                    span='( '+span+' )';
                }

                if(type==1 || type==2 || type==5){
                    var rs_a=rs.split(',');
                    for(var m=0;m<rs_a.length;m++){
                        var name='';
                        var v2=rs_a[m];
                        if(m==0){
                            name=select_list && select_list[v2] ? select_list[v2] : '';
                            span+=name;
                        }else{
                            name=select_list && select_list[v2] ? select_list[v2] : '';
                            span+=','+name;
                        }
                    }
                    span='( '+span+' )';
                }

                if(type==4){
                    span='';
                }

                html+='<li class="practice_rs_li">\n' +
                '       <div class="li_t">'+n+' <span>'+span+'</span></div>\n' +
                '       <div class="li_p">\n' +
                '           <div class="li_p_s"></div>\n' +
                '           <div class="li_p_n">0.0%</div>\n' +
                '       </div>\n' +
                '</li>';
            }

            _this.practice_rs_bd.find('ul').html(html);
            _this.practice_rs_nums.find('span').html(0);
            _this.practice_send.hide();
            _this.practice_result.show();

            _this.echart=echarts.init(document.getElementById('practice_echart'));

            _this.upEchart();
        },
        handeltimes:function (time){
            var m=Math.floor(time/60);
            var s=time%60;
            if(m<10){
                m='0'+m;
            }
            if(s<10){
                s='0'+s;
            }
            return m+':'+s;
        },
        setTimer:function (time){
            var _this=this;
            _this.clearTimer();
            var t=_this.handeltimes(time);
            _this.practice_timeing.html(t);
            _this.timer=setInterval(function(){
                time--;
                if (time > 0) {
                    var t=_this.handeltimes(time);
                    _this.practice_timeing.html(t);
                } else {
                    _this.clearTimer();
                    _this.stop();
                }
            },1000)
        },
        clearTimer:function (){
            var _this=this;
            _this.timer && clearInterval(_this.timer);
            _this.timer=null;
            _this.practice_timeing.html('00:00');
        },
        upResult:function (data){
            if(_DATA.roominfo.user_type!=1){
                return !1;
            }

            var _this=this;
            var uid=data.uid;

            _this.upPro();
        },
        upPro:function (){
            let _this=this;
            $.ajax({
                url:'/teacher/liveing/getPracticePro',
                type:'POST',
                data:{courseid:courseid,lessonid:lessonid},
                dataType:'json',
                error:function(e){

                },
                success:function(data){
                    if(data.code==0){
                        handelRes(data);
                        return !1;
                    }
                    var list=data.data.list;
                    var nums=data.data.nums;

                    for(var i=0;i<list.length;i++){
                        var v=list[i];

                        var pre=Math.floor(v *100/nums);
                        var pre2=pre;
                        if(pre<1){
                            pre=1;
                        }
                        var obj=_this.practice_rs_bd.find('.practice_rs_li').eq(i);
                        obj.find('.li_p_s').css({'width':pre+'%'});
                        obj.find('.li_p_n').css({'left':pre+'%'}).html(pre2+'%');
                    }

                    _this.practice_rs_nums.find('span').html(nums);
                }
            })

            _this.upEchart();

        },
        upEchart:function(){
            var _this=this;

            if(_this.issub){
                return !1;
            }
            _this.issub=1;
            $.ajax({
                url:'/teacher/liveing/getPracticeCount',
                type:'POST',
                data:{courseid:courseid,lessonid:lessonid,scoretotal:_this.total_score},
                dataType:'json',
                error:function(e){
                    _this.issub=0;
                },
                success:function(data){
                    _this.issub=0;
                    if(data.code==0){
                        handelRes(data);
                        return !1;
                    }
                    var info=data.data;

                    var option = {
                        series: [
                            {
                                type: 'pie',
                                radius: ['50%', '55%'],
                                center :['50%','60%'],
                                label:{
                                    formatter:'{b} {d}%'
                                },
                                data: [
                                    {value: info.c1, name: '优秀',itemStyle:{normal:{color:'#72C535'}}},
                                    {value: info.c2, name: '良好',itemStyle:{normal:{color:'#56D6E5'}}},
                                    {value: info.c3, name: '一般',itemStyle:{normal:{color:'#04B2B8'}}},
                                    {value: info.c4, name: '及格',itemStyle:{normal:{color:'#F7D961'}}},
                                    {value: info.c5, name: '不及格',itemStyle:{normal:{color:'#F77026'}}}
                                ]
                            }
                        ]
                    };

                    _this.echart.setOption(option);
                }
            })
        },
        stop:function (){
            var _this=this;
            _this.clearTimer();
            _this.practice_ing.hide();

            var msg = '{"msg":[{"_method_":"practice","action":"2","source":"PC"}],"retcode":"000000","retmsg":"OK"}';
            Socket.emitData('broadcast',msg);

            setTimeout(function(){
                _this.upPro();
                $.ajax({
                    url:'/teacher/liveing/getPracticeAve',
                    type:'POST',
                    data:{courseid:courseid,lessonid:lessonid},
                    dataType:'json',
                    error:function(e){
                    },
                    success:function(data){
                        if(data.code==0){
                            handelRes(data);
                            return !1;
                        }
                        var info=data.data;

                        _this.practice_end.find('#practice_ave_score').html(info.ave+'分');
                        _this.practice_end.css({display: 'flex'});
                    }
                })
            },3000);
        },
        showUser:function (){
            var _this=this;
            if(_this.issub){
                return !1;
            }
            _this.issub=1;
            $.ajax({
                url:'/teacher/liveing/getPracticeUser',
                type:'POST',
                data:{courseid:courseid,lessonid:lessonid},
                dataType:'json',
                error:function(e){
                    _this.issub=0;
                },
                success:function(data){
                    _this.issub=0;
                    if(data.code==0){
                        handelRes(data);
                        return !1;
                    }
                    var list=data.data;
                    var html='';
                    for (var i=0;i<list.length;i++){
                        var v=list[i];
                        var no=i+1;
                        html+='<li>\n' +
                            '     <div class="exam_user_list_t1">'+no+'</div>\n' +
                            '     <div class="exam_user_list_t2">'+v.user_nickname+'</div>\n' +
                            '     <div class="exam_user_list_t3">'+v.score+'</div>\n' +
                            '     <div class="exam_user_list_t4 praise" data-uid="'+v.id+'" data-name="'+v.user_nickname+'">表扬</div>\n' +
                            '</li>';
                    }
                    _this.practice_user.find('ul').html(html);

                    _this.layer_user=layer.open({
                        type: 1,
                        title:false,
                        closeBtn:0,
                        area: ['600px', '500px'],
                        content: _this.practice_user
                    });
                }
            })
        },
        end:function (){
            var _this=this;
            _this.question_show.hide();
            _this.practice_send.hide();
            _this.practice_ing.show();
            _this.practice_end.hide();
            _this.practice_result.hide();
            _this.js_practice.removeClass('on');
            _this.clear();
            _this.draft_title.val('');
            _this.practice_time.val('10');

            var msg = '{"msg":[{"_method_":"practice","action":"0","source":"PC"}],"retcode":"000000","retmsg":"OK"}';
            Socket.emitData('broadcast',msg);
        },
        getDraft:function (){
            let _this=this;
            $.ajax({
                url:'/teacher/liveing/getPracticeDraft',
                type:'POST',
                data:{courseid:courseid,lessonid:lessonid},
                dataType:'json',
                error:function (e){

                },
                success:function (data){
                    if(data.code==0){
                        handelRes(data);
                        return !1;
                    }
                    let list=data.data;
                    let html='';
                    for(let i=0;i<list.length;i++){
                        let v=list[i];
                        let span='';
                        if(v.type==1){
                            span='<span>（题库）</span>';
                        }
                        html+='<li data-id="'+v.id+'">\n' +
                            '                            <input type="radio" name="d_id" value="'+v.id+'" id="d_'+v.id+'">\n' +
                            '                            <label for="d_'+v.id+'"></label>\n' +
                            '                            <div class="d_li_bd">\n' +
                            '                                <div class="d_top">\n' +
                            '                                    <div class="d_name">'+v.title+span+'</div>\n' +
                            '                                    <span class="d_del"></span>\n' +
                            '                                </div>\n' +
                            '                                <div class="d_info">\n' +
                            '                                    <span>题目：'+v.nums+'</span>\n' +
                            '                                    <span>总分：'+Number(v.score)+'分</span>\n' +
                            '                                </div>\n' +
                            '                            </div>\n' +
                            '                        </li>';
                    }

                    _this.draft_list.find('ul').html(html);
                    _this.draft=list;
                }
            })
        },
        setDraft:function (){
            let _this=this;
            let title=_this.draft_title.val();
            if(title==''){
                layer.msg('请先填写简介');
                return !1;
            }
            let res=_this.check();
            if(!res){
                return !1;
            }

            $.ajax({
                url:'/teacher/liveing/setPracticeDraft',
                type:'POST',
                data:{
                    courseid:courseid,
                    lessonid:lessonid,
                    type:_this.type,
                    title:title,
                    time:res.time,
                    answer:JSON.stringify(res.answer),
                    content:JSON.stringify(res.content),
                    nums:_this.total_nums,
                    score:_this.total_score
                },
                dataType:'json',
                error:function (e){

                },
                success:function (data){
                    if(data.code==0){
                        handelRes(data);
                        return !1;
                    }
                    layer.msg(data.msg);
                }
            })
        },
        delDraft:function (_that){
            let _this=this;
            let li=_that.parents('li');
            let id=li.data('id');
            let index=li.index();
            $.ajax({
                url:'/teacher/liveing/delPracticeDraft',
                type:'POST',
                data:{courseid:courseid,lessonid:lessonid,id:id},
                dataType:'json',
                error:function (e){

                },
                success:function (data){
                    if(data.code==0){
                        handelRes(data);
                        return !1;
                    }
                    li.remove();
                    _this.draft.splice(index,1);
                }
            })
        },
        sendDraft:function (){
            let _this=this;
            let id=_this.draft_list.find('input[type=radio]:checked').val();
            if(!id){
                layer.msg('请选择练习草稿');
                return !1;
            }
            let info={};
            let list=cloneObject(_this.draft);
            for(let i=0;i<list.length;i++){
                let v2=list[i];
                if(v2.id==id){
                    info=v2;
                    break;
                }
            }
            if(JSON.stringify(info)=='{}'){
                layer.msg('选择的练习错误，请重选');
                return !1;
            }

            if(_this.issub){
                return !1;
            }

            if(info.type==1){
                _this.question_show.show();
                let list=info.content;
                let html='';
                for(let i=0;i<list.length;i++){
                    let v=list[i];
                    let type=v.type;
                    let num=i+1;
                    let select2='';
                    if(type==1 || type==2 || type==5){
                        //选择
                        let ans=v.ans;
                        for(let m=0;m<ans.length;m++){
                            let name=select_list && select_list[m] ? select_list[m] : '';
                            select2+='<div class="li_item">'+name+'.'+ans[m]+'</div>';
                        }
                    }


                    html+='<li data-id="'+v.id+'">\n' +
                        '                <div class="li_l">\n' +
                        '                    <div class="li_l_t">'+num+'.<span>'+type_list[type]+'</span> '+v.title+'</div>\n' +
                        select2 +
                        '                </div>\n' +
                        '                <div class="li_r">\n' +
                        '                </div>\n' +
                        '            </li>';
                }
                _this.question_show.find('ul').html(html);
            }else{
                _this.question_show.hide();
            }
            let content=JSON.parse(JSON.stringify(info.content));
            let answer=JSON.parse(JSON.stringify(info.answer));
            _this.practice_list=JSON.parse(JSON.stringify(info.answer));

            _this.total_score=info.score;
            _this.total_nums=info.nums;
            _this.practice_nums.html(info.nums);
            _this.practice_score.html(info.score);

            _this.send(info.type,info.time,content,answer);

        }

    };
    /* 抢 */
    const Rob={
        js_rob:$('.js_rob'),
        rob:$('.rob'),
        layer_rob:null,
        init:function (){
            var _this=this;
            _this.js_rob.on('click',function (){
                _this.sendRob();
            })
            _this.rob.on('click','.rob_u_c',function(){
                var _that=$(this);
                _this.setMic(_that);
            })

            _this.rob.on('click','.btn',function(){
                _this.end();
            })
        },

        setDef:function (){
            var _this=this;
            var html='';
            for(var i=0;i<3;i++){
                html+='<li class="no">\n' +
                    '     <div class="rob_u_img">\n' +
                    '         <img src="/static/teacher/images/white/moren.png">\n' +
                    '     </div>\n' +
                    '     <div class="rob_u_name">等待抢答</div>\n' +
                    '     <div class="rob_u_c"></div>\n' +
                    '</li>';
            }
            _this.rob.find('.rob_m ul').html(html);
        },
        sendRob:function (){
            var _this=this;
            //_this.rob.show();
            _this.setDef();
            $.ajax({
                url:'/teacher/liveing/clearRobUser',
                type:'POST',
                data:{courseid:courseid,lessonid:lessonid},
                dataType:'json',
                error:function(e){
                },
                success:function(data){
                    _this.layer_rob=layer.open({
                        type: 1,
                        title:false,
                        skin:'layui-layer-page-border',
                        closeBtn:0,
                        shade:false,
                        move:'.rob_t',
                        area: ['320px', '300px'],
                        content: _this.rob
                    });
                    var msg = '{"msg":[{"_method_":"rob","action":"1","source":"PC"}],"retcode":"000000","retmsg":"OK"}';
                    Socket.emitData('broadcast',msg);
                }
            })

        },
        setMic:function(_that){
            var _this=this;
            var ismic=_that.data('ismic');
            if(ismic==1){
                return !1;
            }
            var linkmic=$('.linkmic_list').find(".list_li");
            if(linkmic.length>=16){
                layer.msg('连麦人数已达上限，无法上麦');
                return  !1;
            }
            var touid=_that.parent().data('uid');
            $.ajax({
                url:'/teacher/liveing/setLinkmicByrob',
                type:'POST',
                data:{courseid:courseid,lessonid:lessonid,stream:stream,touid:touid},
                dataType:'json',
                error:function(e){
                },
                success:function(data){
                    if(data.code==0){
                        handelRes(data);
                        return !1;
                    }

                    _that.data('ismic',1);
                    _that.find('span').html('已在麦上');
                    var msg = '{"msg":[{"_method_":"LinkMic","uid":"'+_DATA.userinfo.id+'","avatar":"'+_DATA.userinfo.avatar+'","user_nickname":"'+_DATA.userinfo.user_nickname+'","action":"6","source":"PC","touid":"'+touid+'"}],"retcode":"000000","retmsg":"OK"}';
                    Socket.emitData('broadcast',msg);

                }
            })
        },
        upList:function (data){
            if(_DATA.roominfo.user_type!=1){
                return !1;
            }
            var _this=this;
            var uid=data.uid;
            var avatar=data.avatar;
            var user_nickname=data.user_nickname;
            var list=_this.rob.find('li.no');
            if(list.length==0){
                return !1;
            }
            var isexist=_this.rob.find('li[data-uid="'+uid+'"]');
            if(isexist.length>0){
                return !1;
            }
            var ismic=0;
            var linkmic=$('.linkmic_list').find("#linkmic_"+uid);
            if(linkmic.length>0){
                ismic=1;
            }

            var c='上麦';
            if(ismic==1){
                c='已在麦上';
            }

            var obj=list.eq(0);

            var html='<li data-uid="'+uid+'">\n' +
                '    <div class="rob_u_img">\n' +
                '        <img src="'+avatar+'">\n' +
                '    </div>\n' +
                '    <div class="rob_u_name">'+user_nickname+'</div>\n' +
                '    <div class="rob_u_c" data-ismic="'+ismic+'"><span>'+c+'</span></div>\n' +
                '</li>';

            obj.before(html);
            obj.remove();
        },
        upMic:function (touid,type){
            var _this=this;
        },
        end:function(){
            var _this=this;
            //_this.rob.hide();
            layer.close(_this.layer_rob);
            var msg = '{"msg":[{"_method_":"rob","action":"0","source":"PC"}],"retcode":"000000","retmsg":"OK"}';
            Socket.emitData('broadcast',msg);
        }
    };
    /* 懂 */
    const Know={
        js_know:$('.js_know'),
        know_result:$('.know_result'),
        know_ok:$('.know_ok'),
        user_list:[],
        know_list:['0','0'],
        init:function (){
            var _this=this;
            _this.js_know.on('click',function (){
                _this.send();
                _this.showResult();
            })
            _this.know_ok.on('click',function (){
                _this.end();
            })
        },
        send:function (){
            var _this=this;
            _this.user_list=[];
            _this.know_list=['0','0'];
            var msg = '{"msg":[{"_method_":"know","action":"1","source":"PC"}],"retcode":"000000","retmsg":"OK"}';
            Socket.emitData('broadcast',msg);
        },
        showResult:function (){
            var _this=this;
            var usernums=_this.user_list.length;
            var list=_this.know_list;
            for(var i=0;i<list.length;i++){
                var v=list[i];

                var pre=0;
                if(usernums){
                    pre=Math.floor(v *100/usernums);
                }

                var pre2=pre;
                if(pre<1){
                    pre=1;
                }
                var obj=_this.know_result.find('.know_rs_li').eq(i);
                obj.find('.li_p_s').css({'width':pre+'%'});
                obj.find('.li_p_n').css({'left':pre+'%'}).html(pre2+'%');
                obj.find('.li_t span').html('('+v+'人)');
            }
            _this.know_result.show();
        },
        upResult:function (data){
            var _this=this;
            var uid=data.uid;

            if($.inArray(uid,_this.user_list)>=0){
                return !1;
            }

            _this.user_list.push(uid);
            var usernums=_this.user_list.length;

            var isknow=data.isknow;
            if(isknow==1){
                _this.know_list[0]++;
            }else{
                _this.know_list[1]++;
            }

            var list=_this.know_list;
            for(var i=0;i<list.length;i++){
                var v=list[i];

                var pre=Math.floor(v *100/usernums);
                var pre2=pre;
                if(pre<1){
                    pre=1;
                }
                var obj=_this.know_result.find('.know_rs_li').eq(i);
                obj.find('.li_p_s').css({'width':pre+'%'});
                obj.find('.li_p_n').css({'left':pre+'%'}).html(pre2+'%');
                obj.find('.li_t span').html('('+v+'人)');
            }
        },
        end:function (){
            var _this=this;
            _this.know_result.hide();
            var msg = '{"msg":[{"_method_":"know","action":"0","source":"PC"}],"retcode":"000000","retmsg":"OK"}';
            Socket.emitData('broadcast',msg);
        }
    };
    /* 表扬 */
    const Praise={
        init:function (){
            $('body').on('click','.praise',function (){
                var _that=$(this);
                var uid=_that.data('uid');
                var name=_that.data('name');
                if(!uid){
                    return !1;
                }
                var msg = '{"msg":[{"_method_":"praise","action":"1","source":"PC","touid":"'+uid+'","toname":"'+name+'"}],"retcode":"000000","retmsg":"OK"}';
                Socket.emitData('broadcast',msg);
            })
        }
    };
    /* 聊天 */
    const Chat={
        title:$('.body_right_speak_tips'),
        msg_area:$('.msg_area'),
        body_right_send_msg:$('.body_right_send_msg'),
        body_right_send_button:$('.body_right_send_button'),
        stopspeak:$('#stopspeak'),
        openchat:$('#openchat'),
        init:function (){
            var _this=this;

            //修改禁言状态
            if(_DATA.roominfo.isshup==1){
                $(":checkbox[id='stopspeak']").prop("checked",true);
            }

            //修改禁言状态
            if(_DATA.roominfo.chatopen==1){
                $(":checkbox[id='openchat']").prop("checked",true);
            }

            _this.title.on('click','span',function(){
                var _that=$(this);
                if(_that.hasClass('on')){
                    return !1;
                }
                _that.siblings().removeClass('on');
                _that.addClass('on');
                _this.msg_area.find('.msg_area_bd').hide().eq(_that.index()).show();
            })

            //点击发言
            _this.body_right_send_button.click(function(){
                _this.sendMsg();
            })

            //全体禁言
            _this.stopspeak.click(function(){
                _this.roomShutup();
            })
            //开放交流区
            _this.openchat.click(function(){
                _this.roomChat();
            })
        },
        addAsk:function (data){
            var _this=this;
            var html='<div class="ask_li" data-addtime="'+data.addtime+'" data-nums="1">\n' +
                '     <p class="ask_li_name">提问者：'+data.user_nickname+'</p>\n' +
                '     <p class="ask_li_c">'+data.content+'</p>\n' +
                '     <p class="ask_li_nums"><span>1</span>人提问</p>\n' +
                '</div>';

            var obj=_this.msg_area.find('.body_right_ask');
            obj.append(html);

            var scrollHeight = obj.prop("scrollHeight");
            obj.scrollTop(scrollHeight,200);
        },
        upAskNums:function (data){
            var _this=this;
            var addtime=data.addtime;
            var obj=_this.msg_area.find('.ask_li[data-addtime="'+addtime+'"] ');
            if(obj.length<1){
                return !1;
            }

            var nums=obj.data('nums');
            nums+=1;
            obj.data('nums',nums);
            obj.find('.ask_li_nums span').html(nums);
        },
        sendMsg:function (){
            var _this=this;
            var value=_this.body_right_send_msg.val();
            if(value==''){
                layer.msg('请输入要发言的内容');
                return !1;
            }

            if(!$.trim(value)){
                layer.msg('不能只发送空格');
                return !1;
            }

            _this.body_right_send_msg.val('');

            var msg = '{"msg":[{"_method_":"SendMsg","action":1,"content":"'+value+'","uid":"'+_DATA.userinfo.id+'","avatar":"'+_DATA.userinfo.avatar+'","user_nickname":"'+_DATA.userinfo.user_nickname+'","user_type":"'+_DATA.roominfo.user_type+'"}],"retcode":"000000","retmsg":"OK"}';
            Socket.emitData('broadcast',msg);
        },
        roomShutup:function (){
            var _this=this;
            var ischecked=_this.stopspeak.is(':checked');
            var isshup='';
            if(ischecked==true){ //表示要进行禁言
                if(_DATA.roominfo.isshup==1){
                    return ;
                }
                isshup=1;
            }else{ //要进行取消禁言
                if(_DATA.roominfo.isshup==0){
                    return ;
                }
                isshup=0;
            }

            $.ajax({
                type: "POST",
                url:'/teacher/liveing/roomShutup',
                data:{courseid:courseid,lessonid:lessonid,type:isshup},
                dataType:'json',
                error: function(request)
                {
                    layer.msg("数据请求失败");
                },
                success: function(data)
                {
                    if(data.code==0){
                        if(isshup==0){
                            $(":checkbox[id='stopspeak']").prop("checked",true);
                        }else{
                            $(":checkbox[id='stopspeak']").prop("checked",false);
                        }
                        handelRes(data);
                        return !1;
                    }
                    layer.msg(data.msg);

                    _DATA.roominfo.isshup=isshup;

                    var msg = '{"msg":[{"_method_":"roomShutup","action":"'+isshup+'","uid":"'+_DATA.userinfo.id+'","avatar":"'+_DATA.userinfo.avatar+'","user_nickname":"'+_DATA.userinfo.user_nickname+'"}],"retcode":"000000","retmsg":"OK"}';

                    Socket.emitData('broadcast',msg);
                }
            })
        },
        roomChat:function (){
            var _this=this;
            var ischecked=_this.openchat.is(':checked');
            var isopen='';
            if(ischecked==true){ //表示要进行禁言
                if(_DATA.roominfo.chatopen==1){
                    return ;
                }
                isopen=1;
            }else{ //要进行取消禁言
                if(_DATA.roominfo.chatopen==0){
                    return ;
                }
                isopen=0;
            }

            $.ajax({
                type: "POST",
                url:'/teacher/liveing/roomChat',
                data:{courseid:courseid,lessonid:lessonid,type:isopen},
                dataType:'json',
                error: function(request)
                {
                    layer.msg("数据请求失败");
                },
                success: function(data)
                {
                    if(data.code==0){
                        if(isopen==0){
                            $(":checkbox[id='openchat']").prop("checked",true);
                        }else{
                            $(":checkbox[id='openchat']").prop("checked",false);
                        }
                        handelRes(data);
                        return !1;
                    }
                    layer.msg(data.msg);

                    _DATA.roominfo.chatopen=isopen;

                    var msg = '{"msg":[{"_method_":"roomChat","action":"'+isopen+'","uid":"'+_DATA.userinfo.id+'","avatar":"'+_DATA.userinfo.avatar+'","user_nickname":"'+_DATA.userinfo.user_nickname+'"}],"retcode":"000000","retmsg":"OK"}';

                    Socket.emitData('broadcast',msg);
                }
            })
        }
    };

$(function(){
    Wind.css('layer');
    Wind.use('layer',function(){
        if(_DATA.roominfo.user_type==1){
            /* 讲师检测设备 */
            stratCheck();
        }
    });
    
    init();

    $(".js_check_ok").click(function(){
        closeCheck();
        preview();
    })

    /*****这下面都是一些课堂操作 */
    //把鼠标放到教具上
    $('.body_left_bottom_top_c_img').each(function(){
        var _this=$(this);
        var type=_this.data('type');
        _this.mouseover(function(){
            if(type=='selector'){
                laytips=layer.tips('选择器', _this, {
                    tips: [1, '#38DAA6'],
                });
            }

            if(type=='pencil'){
                laytips=layer.tips('铅笔', _this, {
                    tips: [1, '#38DAA6'],
                });
            }

            if(type=='rectangle'){
                laytips=layer.tips('矩形', _this, {
                    tips: [1, '#38DAA6'],
                });
            }

            if(type=='ellipse'){
                laytips=layer.tips('椭圆', _this, {
                    tips: [1, '#38DAA6'],
                });
            }

            if(type=='eraser'){
                laytips=layer.tips('橡皮', _this, {
                    tips: [1, '#38DAA6'],
                });
            }

            if(type=='text'){
                laytips=layer.tips('文字', _this, {
                    tips: [1, '#38DAA6'],
                });
            }

            if(type=='choosecolor'){
                laytips=layer.tips('吸色器', _this, {
                    tips: [1, '#38DAA6'],
                });
            }

            if(type=='fontsize'){
                laytips=layer.tips('线条粗细', _this, {
                    tips: [1, '#38DAA6'],
                });
            }

            if(type=='file'){
                laytips=layer.tips('文档转换', _this, {
                    tips: [1, '#38DAA6'],
                });
            }

            if(type=='insertImage'){
                laytips=layer.tips('上传图片', _this, {
                    tips: [1, '#38DAA6'],
                });
            }

            if(type=='del'){
                laytips=layer.tips('清屏', _this, {
                    tips: [1, '#38DAA6'],
                });
            }

        })
    })

    //把鼠标移开教具
    $('.body_left_bottom_top_c_img').each(function(){
        var _this=$(this);
        _this.mouseout(function(){
            layer.close(laytips);
        })
    })

    //把鼠标放到上传文档上
    $('.body_left_bottom_top_c_img_file').each(function(i){
        var _this=$(this);
        _this.mouseover(function(){
            if(i==0){
                laytipsfile=layer.tips('上传文档', _this, {
                    tips: [1, '#38DAA6'],
                });
            }
            if(i==1){
                laytipsfile=layer.tips('上传图片', _this, {
                    tips: [1, '#38DAA6'],
                });
            }
        })
    })

    //把鼠标移开上传文档上
    $('.body_left_bottom_top_c_img_file').each(function(){
        var _this=$(this);
        _this.mouseout(function(){
            layer.close(laytipsfile);
        })
    })
    //修改教具
    $('.body_left_bottom_top_c_img').click(function(){

        var _this=$(this);
        var type=_this.data('type');

        if(type!='fontsize' && type!='del' && type!='insertImage' && type!='file'){
            $('.body_left_bottom_top_c_img').eq(0).attr('src','/static/teacher/images/white/selector.png');
            $('.body_left_bottom_top_c_img').eq(1).attr('src','/static/teacher/images/white/pencil.png');
            $('.body_left_bottom_top_c_img').eq(2).attr('src','/static/teacher/images/white/ju.png');
            $('.body_left_bottom_top_c_img').eq(3).attr('src','/static/teacher/images/white/yuan.png');
            $('.body_left_bottom_top_c_img').eq(4).attr('src','/static/teacher/images/white/t.png');
            $('.body_left_bottom_top_c_img').eq(5).attr('src','/static/teacher/images/white/er.png');
            $('.body_left_bottom_top_c_img').eq(6).attr('src','/static/teacher/images/white/xi.png');
            $('.body_left_bottom_top_c_img').eq(7).attr('src','/static/teacher/images/white/b.png');
            //$('.body_left_bottom_top_c_img').eq(8).attr('src','/static/teacher/images/white/del.png');          
        }



        //选择selector
        if(type=='selector'){
            _this.attr('src','/static/teacher/images/white/selector1.png');
        }

        //选择铅笔
        if(type=='pencil'){
            if(JSON.stringify(whiteinfo.strokeColor) == '[22,156,142]'){
                _this.attr('src','/static/teacher/images/white/pencil2.png');
            }else if(JSON.stringify(whiteinfo.strokeColor) == '[52,68,90]'){
                _this.attr('src','/static/teacher/images/white/pencil1.png');
            }else if(JSON.stringify(whiteinfo.strokeColor) == "[246,89,50]"){
                _this.attr('src','/static/teacher/images/white/pencil3.png');
            }else if(JSON.stringify(whiteinfo.strokeColor) == "[51,161,245]"){
                _this.attr('src','/static/teacher/images/white/pencil4.png');
            }
        }

        //选择矩形
        if(type=='rectangle'){
            if(JSON.stringify(whiteinfo.strokeColor) == '[22,156,142]'){
                _this.attr('src','/static/teacher/images/white/ju1.png');
            }else if(JSON.stringify(whiteinfo.strokeColor) == '[52,68,90]'){
                _this.attr('src','/static/teacher/images/white/ju2.png');
            }else if(JSON.stringify(whiteinfo.strokeColor) == "[246,89,50]"){
                _this.attr('src','/static/teacher/images/white/ju3.png');
            }else if(JSON.stringify(whiteinfo.strokeColor) == "[51,161,245]"){
                _this.attr('src','/static/teacher/images/white/ju4.png');
            }
        }
        
        //选择圆形
        if(type=='ellipse'){
            if(JSON.stringify(whiteinfo.strokeColor) == '[22,156,142]'){
                _this.attr('src','/static/teacher/images/white/yuan1.png');
            }else if(JSON.stringify(whiteinfo.strokeColor) == '[52,68,90]'){
                _this.attr('src','/static/teacher/images/white/yuan2.png');
            }else if(JSON.stringify(whiteinfo.strokeColor) == "[246,89,50]"){
                _this.attr('src','/static/teacher/images/white/yuan3.png');
            }else if(JSON.stringify(whiteinfo.strokeColor) == "[51,161,245]"){
                _this.attr('src','/static/teacher/images/white/yuan4.png');
            }
        }

                
        //选择字
        if(type=='text'){
            if(JSON.stringify(whiteinfo.strokeColor) == '[22,156,142]'){
                _this.attr('src','/static/teacher/images/white/t1.png');
            }else if(JSON.stringify(whiteinfo.strokeColor) == '[52,68,90]'){
                _this.attr('src','/static/teacher/images/white/t2.png');
            }else if(JSON.stringify(whiteinfo.strokeColor) == "[246,89,50]"){
                _this.attr('src','/static/teacher/images/white/t3.png');
            }else if(JSON.stringify(whiteinfo.strokeColor) == "[51,161,245]"){
                _this.attr('src','/static/teacher/images/white/t4.png');
            }
        }     

        //选择橡皮
        if(type=='eraser'){
            _this.attr('src','/static/teacher/images/white/er1.png');
        }

        //选择字体颜色
        if(type=='choosecolor'){
            $('.white_fontsize').css('display','none');
            $('.white_choosecolor').css('display','block');

            
            _this.attr('src','/static/teacher/images/white/xi1.png');
            return ;
        }


        //选择字体粗细
        if(type=='fontsize'){
            $('.white_fontsize').css('display','block');
            $('.white_choosecolor').css('display','none');

            _this.attr('src','/static/teacher/images/white/b1.png');
            return ;
        }

        //清屏
        if(type=='del'){
            whiteroom.cleanCurrentScene(true);
            return ;
        }
        
        whiteinfo.currentApplianceName=type; //保存教具类型
        whiteroom.setMemberState({
            currentApplianceName: type,
            strokeColor:  whiteinfo.strokeColor,
            strokeWidth: whiteinfo.strokeWidth,
            textSize: whiteinfo.textSize,
        });
    })

    //选择颜色
    $('.white_choosecolor_color').click(function(){

        var color=$(this).data('color');
        whiteinfo.strokeColor=color;
        $('.white_choosecolor').css('display','none');
        $('.body_left_bottom_top_c_img').eq(6).attr('src','/static/teacher/images/white/xi.png');

        //选择铅笔
        if(whiteinfo.currentApplianceName=='pencil'){
            if(JSON.stringify(whiteinfo.strokeColor) == '[22,156,142]'){
                $('.body_left_bottom_top_c_img').eq(1).attr('src','/static/teacher/images/white/pencil2.png');
            }else if(JSON.stringify(whiteinfo.strokeColor) == '[52,68,90]'){
                $('.body_left_bottom_top_c_img').eq(1).attr('src','/static/teacher/images/white/pencil1.png');
            }else if(JSON.stringify(whiteinfo.strokeColor) == "[246,89,50]"){
                $('.body_left_bottom_top_c_img').eq(1).attr('src','/static/teacher/images/white/pencil3.png');
            }else if(JSON.stringify(whiteinfo.strokeColor) == "[51,161,245]"){
                $('.body_left_bottom_top_c_img').eq(1).attr('src','/static/teacher/images/white/pencil4.png');
            }
        }

        //选择矩形
        if( whiteinfo.currentApplianceName=='rectangle'){
            if(JSON.stringify(whiteinfo.strokeColor) == '[22,156,142]'){
                $('.body_left_bottom_top_c_img').eq(2).attr('src','/static/teacher/images/white/ju1.png');
            }else if(JSON.stringify(whiteinfo.strokeColor) == '[52,68,90]'){
                $('.body_left_bottom_top_c_img').eq(2).attr('src','/static/teacher/images/white/ju2.png');
            }else if(JSON.stringify(whiteinfo.strokeColor) == "[246,89,50]"){
                $('.body_left_bottom_top_c_img').eq(2).attr('src','/static/teacher/images/white/ju3.png');
            }else if(JSON.stringify(whiteinfo.strokeColor) == "[51,161,245]"){
                $('.body_left_bottom_top_c_img').eq(2).attr('src','/static/teacher/images/white/ju4.png');
            }
        }
        
        //选择圆形
        if( whiteinfo.currentApplianceName=='ellipse'){
            if(JSON.stringify(whiteinfo.strokeColor) == '[22,156,142]'){
                $('.body_left_bottom_top_c_img').eq(3).attr('src','/static/teacher/images/white/yuan1.png');
            }else if(JSON.stringify(whiteinfo.strokeColor) == '[52,68,90]'){
                $('.body_left_bottom_top_c_img').eq(3).attr('src','/static/teacher/images/white/yuan2.png');
            }else if(JSON.stringify(whiteinfo.strokeColor) == "[246,89,50]"){
                $('.body_left_bottom_top_c_img').eq(3).attr('src','/static/teacher/images/white/yuan3.png');
            }else if(JSON.stringify(whiteinfo.strokeColor) == "[51,161,245]"){
                $('.body_left_bottom_top_c_img').eq(3).attr('src','/static/teacher/images/white/yuan4.png');
            }
        }

                
        //选择字
        if(whiteinfo.currentApplianceName=='text'){
            if(JSON.stringify(whiteinfo.strokeColor) == '[22,156,142]'){
                $('.body_left_bottom_top_c_img').eq(4).attr('src','/static/teacher/images/white/t1.png');
            }else if(JSON.stringify(whiteinfo.strokeColor) == '[52,68,90]'){
                $('.body_left_bottom_top_c_img').eq(4).attr('src','/static/teacher/images/white/t2.png');
            }else if(JSON.stringify(whiteinfo.strokeColor) == "[246,89,50]"){
                $('.body_left_bottom_top_c_img').eq(4).attr('src','/static/teacher/images/white/t3.png');
            }else if(JSON.stringify(whiteinfo.strokeColor) == "[51,161,245]"){
                $('.body_left_bottom_top_c_img').eq(4).attr('src','/static/teacher/images/white/t4.png');
            }
        }   

        whiteroom.setMemberState({
            currentApplianceName: whiteinfo.currentApplianceName,
            strokeColor:  whiteinfo.strokeColor,
            strokeWidth: whiteinfo.strokeWidth,
            textSize: whiteinfo.textSize,
        });

    })

    //选择字体粗细
    $('.white_fontsize_size').click(function(){
        var size=$(this).data('size');
        whiteinfo.strokeWidth=size;
        $('.white_fontsize').css('display','none');
        $('.body_left_bottom_top_c_img').eq(7).attr('src','/static/teacher/images/white/b.png');

        whiteroom.setMemberState({
            currentApplianceName: whiteinfo.currentApplianceName,
            strokeColor:  whiteinfo.strokeColor,
            strokeWidth: whiteinfo.strokeWidth,
            textSize: whiteinfo.textSize,
        });
    })

    //老师点击关自己的麦
    $('body').on('click','.body_right_video_mai_open',function(){
        var _this=$(this);

        rtc.localStream.muteAudio();
        ismuteAudio=true;
        
        _this.css('display','none');
        $('.body_right_video_mai_close').css('display','block');
        
        var msg = '{"msg":[{"_method_":"setLiveModel","uid":"'+_DATA.userinfo.id+'","action":"1","source":"PC","touid":"'+_DATA.userinfo.id+'"}],"retcode":"000000","retmsg":"OK"}';
        Socket.emitData('broadcast',msg);
    })

    //老师点击关自己摄像头
    $('body').on('click','.body_right_video_video_open',function(){
        var _this=$(this);

        rtc.localStream.muteVideo();
        ismuteVideo=true;
        
        _this.css('display','none');
        
        $('.body_right_video_bg').addClass('on');
        
        $('.body_right_video_video_close').css('display','block');
        
        var msg = '{"msg":[{"_method_":"setLiveModel","uid":"'+_DATA.userinfo.id+'","action":"3","source":"PC","touid":"'+_DATA.userinfo.id+'"}],"retcode":"000000","retmsg":"OK"}';
        Socket.emitData('broadcast',msg);
    })

    //老师点击开自己的麦
    $('body').on('click','.body_right_video_mai_close',function(){
        var _this=$(this);
        
        rtc.localStream.unmuteAudio();
        ismuteAudio=false;
        
        _this.css('display','none');
        $('.body_right_video_mai_open').css('display','block');
        
        var msg = '{"msg":[{"_method_":"setLiveModel","uid":"'+_DATA.userinfo.id+'","action":"2","source":"PC","touid":"'+_DATA.userinfo.id+'"}],"retcode":"000000","retmsg":"OK"}';
        Socket.emitData('broadcast',msg);
    })

    //老师点击开自己的摄像头
    $('body').on('click','.body_right_video_video_close',function(){
        var _this=$(this);

        rtc.localStream.unmuteVideo();
        ismuteVideo=false;
        
        _this.css('display','none');
        $('.body_right_video_video_open').css('display','block');
        
        $('.body_right_video_bg').removeClass('on');
        
        var msg = '{"msg":[{"_method_":"setLiveModel","uid":"'+_DATA.userinfo.id+'","action":"4","source":"PC","touid":"'+_DATA.userinfo.id+'"}],"retcode":"000000","retmsg":"OK"}';
        Socket.emitData('broadcast',msg);

    })


    //老师点击共享屏幕
    $('.body_left_bottom_bottom_gongxiang1').click(function(){

        if(!rtc.localStream){
            layer.msg('还没有上课');
            return ;
        }
        teacherscreen.setScreen();

        $('.body_left_bottom_bottom_gongxiang1').css('display','none');
        $('.body_left_bottom_bottom_gongxiang2').css('display','block');
                    
    })
    
    //老师点击取消共享屏幕
    $('.body_left_bottom_bottom_gongxiang2').click(function(){

        if(!rtc.localStream_screen){
            //layer.msg('没有共享屏幕');
            return ;
        }
        teacherscreen.stopScreen();

        $('.body_left_bottom_bottom_gongxiang1').show();
        $('.body_left_bottom_bottom_gongxiang2').hide();
                    
    })
	
    /* 切换PPT */
    $('.ppt_preview').on('click','.ppt_view',function(){
        var _this=$(this);
        var li=_this.parent();
        if(li.hasClass('on')){
            return !1;
        }
        
        var page=li.data('page');
        whiteroom.setSceneIndex(page);
        
        li.siblings().removeClass('on');
        li.addClass('on');
        
        upPage();
    })
    
    /* 关闭预览 */
    $('.ppt_preview').on('click','.ppt_preview_t_c',function(){
        var _this=$(this);
        
        $('.ppt_preview').removeClass("on");
    })
    
    /* 删除 */
    $('.ppt_preview').on('click','.ppt_btn_del',function(){
        var _this=$(this);
        var li=_this.parent().parent();
        
        var page=li.data('page');
        var path=li.data('path');
        // console.log(path);
        whiteroom.removeScenes(path);
        
        if(whiteroom.state.sceneState.scenePath=='/init'){
            /* 当前ppt已全部删除 */
            $.ajax({
                type: "POST",
                url:'/teacher/liveing/upfileuuid',
                data:{courseid:courseid,lessonid:lessonid,file_uuid:''},
                error: function(request)
                {
                    layer.msg("数据请求失败");
                },
                success: function(data)
                {
                }
            })
            hidePagePpt();
        }else{
            pptpreview();
            upPage(); 
        }
        
    })
    var pre_laytips=null;
    $('#whiteboard').on('mouseover','.whiteboard_preview',function(){
        var _this=$(this);
        if(!pre_laytips){
            pre_laytips=layer.tips('预览', _this, {
                tips: [1, '#38DAA6'],
            });
        }
        
    })
    $('#whiteboard').on('mouseout','.whiteboard_preview',function(){
        layer.close(pre_laytips);
        pre_laytips=null;
    })
    
})

/**下面这些是老师的共享屏幕操作 */
var teacherscreen={
    //老师开始生成共享屏幕的房间和流
    setScreen:function(){
        var _this=this;

        if(!rtc.localStream){
            layer.msg('还没有开课');
            return ;
        }
        //老师停止推流
        rtc.client.unpublish(rtc.localStream, function(err) {
            console.log(err);
        })  
        
        // $('.body_right_video_wait').css('display','block');
        $('.body_right_video_caozuo').hide();

        //结束下课然后断流
        if(rtc.localStream){
            // stop stream
            rtc.localStream.stop();
            // close stream
            rtc.localStream.close();
        }
        rtc.localStream = null;

        _this.upScreen(1);
        var client_screen = AgoraRTC.createClient({mode: 'live', codec: "h264"});

        rtc.client_screen=client_screen;
        //加载声网回调
        this.handleEventsScreen(rtc);
        //初始化房间
        rtc.client_screen.init(option.appID, function () {
            //console.log("初始化共享屏幕房间成功");
            // 初始化成功房间后添加一个共享屏幕机器人
            rtc.client_screen.join(option.token, option.channel,999999999, function (uid) {
                console.log("join channel_screen: " + option.channel_screen + " success, uid: " + uid);
                rtc.params_screen.uid = uid;

                //加入房间之后老师直接推共享屏幕的流
                //创建流
                var localStream_screen = AgoraRTC.createStream({
                    streamID: 999999999,
                    audio:true,
                    video:false,
                    screen:true
                });
                rtc.localStream_screen=localStream_screen;

                _this.handleEventsScreenStream(rtc);
                //初始化流
                rtc.localStream_screen.init(function () {
                    console.log("init localStream_screen stream success");
                    rtc.localStream_screen.play("screen",{fit: "contain"},function(errState){
                        var isPlay=checkBrowser.myBrowser();
                        if (errState && errState.status !== "aborted" && isPlay==false){
                            // 播放失败，一般为浏览器策略阻止。引导用户用手势触发恢复播放。
                            layer.confirm('由于浏览器的限制，需要手动点击播放，建议使用最新谷歌浏览器进行观看直播', {
                                title:'提示',
                                btn: ['播放','取消'] //按钮
                            }, function(index){
                                layer.close(index);
                                rtc.localStream_screen.resume().then(
                                    function (result) {
                                        console.log('恢复成功：' + result);
                                    }).catch(
                                    function (reason) {
                                        layer.msg('播放失败，建议使用最新谷歌浏览器');
                                        console.log('恢复失败：' + reason);
                                });
                            }, function(){
                            });
                        }
                    });
                    //成功之后推流
                    if (!rtc.client_screen) {
                        layer.msg('房间初始化失败，请重新进入房间');
                        return;
                    }
                    // if (rtc.published) {
                    //     layer.msg('你已经推流了，请结束推流后重新开播');
                    //     return;
                    // }
                    // var oldState = rtc.published;

                    // publish localStream
                    rtc.client_screen.publish(rtc.localStream_screen, function (err) {
                        //rtc.published = oldState;
                        layer.msg('本地推流失败请重新开始共享屏幕房间进行推流');
                        console.log("publish_screen failed");
                        console.error(err);

                        return ;
                    })

                    //rtc.published = true;
                }, function (err) {
                    //layer.msg('请检查浏览器是否支持，建议使用谷歌浏览器进行操作');
                    _this.stopScreen();
                    console.error("init local_screen stream failed ", err);
                })
            }, function(err) {
                layer.msg('进入共享屏幕房间失败请稍后重试');
                _this.stopScreen();
                console.error("client_screen join failed", err)
            })
            
        }, function (err) {
            _this.stopScreen();
            console.log("AgoraRTC client_screen init failed", err);

            layer.msg('共享屏幕房间初始化失败，请稍后重试');
        });
    },

    //共享屏幕的一些声网回调
    handleEventsScreen:function(rtc) {
        //本地推流回调
        rtc.client_screen.on("stream-published", function(evt) {
            // console.log('本地共享屏幕流推了');
            // console.log(evt.stream);
            // console.log('本地共享屏幕流推了');

            //共享屏幕推流之后发送socket给学生，让他们进来
            var msg = '{"msg":[{"_method_":"ShareScreen","action":"0","uid":"'+_DATA.userinfo.id+'","ct":"","source":"PC","channel_screen":"'+option.channel_screen+'"}],"retcode":"000000","retmsg":"OK"}';
            Socket.emitData('broadcast',msg);
        })

        //异地推流成功后回调
        rtc.client_screen.on("stream-added", function(evt) {
            // // console.log('异地流推了');
            // // console.log(evt);
            // var remoteStream = evt.stream;
            // var id = remoteStream.getId();
    
            // // console.log('异地流推了');
            // // console.log(id);
            // //接受远端流
            // if (id !== _DATA.userinfo.id) {
            //     console.log('不是自己推流');

            //     //先提前生成div否则会可能报错
            //     rtc.client_screen.subscribe(remoteStream, function (err) {
            //         console.log("stream subscribe failed", err);
            //     })
            // }
        })

        //接受远端成功回调之后播放流
        rtc.client_screen.on("stream-subscribed", function (evt) {
            // console.log(evt);
            // var remoteStream = evt.stream;
            // var id = remoteStream.getId();
            // rtc.remoteStreams_screen.push(remoteStream);
            // //获取信息之后再播放
        })

        //推流结束回调
        rtc.client_screen.on("stream-removed", function (evt) {
            // var remoteStream = evt.stream;
            // var id = remoteStream.getId();
            // remoteStream.stop();
            // rtc.remoteStreams_screen = rtc.remoteStreams_screen.filter(function (stream) {
            //     return stream.getId() != id
            // })

            // rtc.client_screen.unsubscribe(remoteStream, function (err) {
            //     console.log("stream unsubscribe failed", err);
            // })
        })

        //有用户离开房间
        rtc.client_screen.on("peer-leave", function(evt) {
            
        });
        
        
    },

    //屏幕共享回调
    handleEventsScreenStream:function(rtc){
        var _this=this;
        //屏幕共享停止回调
        rtc.localStream_screen.on("stopScreenSharing",function(){
            
            //共享屏幕结束推流之后发送socket给学生，让他们出去
            var msg = '{"msg":[{"_method_":"ShareScreen","action":"1","uid":"'+_DATA.userinfo.id+'","ct":"","source":"PC","channel_screen":"'+option.channel_screen+'"}],"retcode":"000000","retmsg":"OK"}';
            Socket.emitData('broadcast',msg);	
            _this.stopScreen();
        })
    },

    //共享屏幕结束后的一些操作
    stopScreen:function(){
        var _this=this;
        //老师离开房间
        if(rtc.localStream_screen){
            // stop stream
            rtc.localStream_screen.stop();
            // close stream
            rtc.localStream_screen.close();
        }
        rtc.localStream_screen = null;

        rtc.remoteStreams_screen = [];

        _this.upScreen(0);
        rtc.client_screen.leave(function () {

        }, function (err) {
            console.log("channel leave failed");
            console.error(err);
        })

        //rtc.client = null;
        // console.log("client_screen end push success");
        console.log('屏幕共享停止了');
        
        $('.body_left_bottom_bottom_gongxiang1').show();
        $('.body_left_bottom_bottom_gongxiang2').hide();


        //屏幕共享停止之后，老师重新推流
        preview(1);
    },
    upScreen:function(type=0){
        if(type==1){
            $('#screen').show();
            $('#caozuo').hide();
        }else{
            $('#screen').hide().html('');
            $('#caozuo').show();
        }
    }
}

/**定时器 */
var timeInterval={
    //上课时间定时器
    classInterval:function(time){
        clearInterval(classIntavl);
        //展示上课时间
        var html='已上课 <span id="start_times"></span>';
        $('.body_left_top_status').html(html);

        classIntavl=setInterval(function(){
            time++;
            var h=Math.floor(time/(60*60));
            var ms=time%(60*60);
            var m=Math.floor(ms/60);
            var s=time%60;

            if(h<10){
                h='0'+h;
            }
            if(m<10){
                m='0'+m;
            }
            if(s<10){
                s='0'+s;
            }
            var html=h+':'+m+':'+s;
            $('.body_left_top_status').find('#start_times').html(html);
        },1000);
    },

    //网络延迟定时器
    rttInterval:function(ispush,remoteStream){

        clearInterval(RTTyan);
        if(ispush==1){
            RTTyan=setInterval(function(){
                rtc.client.getTransportStats(function (stats) {
                    var RTT=stats.RTT || "--";
                    $('#RTT').html(RTT)
                });
            },1000)
        }else{
            RTTyan=setInterval(function(){
                remoteStream.getStats(function (stats) {
                    var RTT=stats.accessDelay || "--";
                    $('#RTT').html(RTT)
                });
            },1000)
        }
    },
}

/*判断浏览器版本**/
var checkBrowser={

    myBrowser:function(){
        var isPlay=true;
        var userAgent = navigator.userAgent; //取得浏览器的userAgent字符串
        if (userAgent.indexOf("Chrome") > -1){ //谷歌浏览器


            var arr = navigator.userAgent.split(' '); 
            var chromeVersion = '';
            for(var i=0;i < arr.length;i++){
                if(/chrome/i.test(arr[i]))
                chromeVersion = arr[i]
            }
            if(chromeVersion){
                if(Number(chromeVersion.split('/')[1].split('.')[0])>70){
                    isPlay=false;
                }
            }
        }
        if (userAgent.indexOf("Safari") > -1) {
            isPlay=false;
        }
        return isPlay;
    }
}

/**上传图片的一些操作 */
function selectFilePhoto(){
    //触发 文件选择的click事件  
    $("#file_photo").trigger("click");
}

function getFilePathPhoto(){
    var file = document.getElementById('file_photo').files[0]; 

    if(!file){
        layer.msg('请上传图片');
        return ;
    }

    if (!(/image/.test(file.type))) {
        layer.msg('请上传图片');
        return ;
    }

    var formData = new FormData(); 
    formData.append('file', file);
    
    $('#file_photo').val('');

    $.ajax({ 
        type: 'post', 
        url: '/teacher/liveing/addPhoto', //上传文件的请求路径必须是绝对路劲
        data: formData, 
        dataType:'json',
        cache: false, 
        processData: false, 
        contentType: false, 
        success:function(data){
            if(data.code==0){
                handelRes(data);
                return !1;
            }

            var img_url = data.data.thumb;
            var img = new Image();
            img.src = img_url;
            img.onload = function(){
                var timestamp=new Date().getTime();
                // 方法1 插入图片占位信息
                // 通过 uuid 来保证，completeImageUpload 更新的是同一张图片地址
                whiteroom.insertImage({
                    uuid: timestamp,
                    centerX: 0, 
                    centerY: 0, 
                    width:img.width, 
                    height:img.height
                });
                // 方法2 传入图片占位 uuid，以及图片网络地址。
                whiteroom.completeImageUpload(timestamp, img_url);
            };
        },
        error:function(e){

        }
    })
}


/**上传文档的一些操作 */
function selectFileFile(){
    //触发 文件选择的click事件  
    $("#file_file").trigger("click");
}

function getFilePathFile(){
    var file = document.getElementById('file_file').files[0]; 

    if(!file){
        layer.msg('请上传文件');
        return ;
    }
    var formData = new FormData(); 
    formData.append('file', file);
    
    $('#file_file').val('');
    var index = layer.load(1, {
        shade: [0.1,'#000'] //0.1透明度的黑色背景
    });
    $.ajax({ 
        type: 'post', 
        url: '/teacher/liveing/addFiles', //上传文件的请求路径必须是绝对路劲
        data: formData, 
        dataType:'json',
        cache: false, 
        processData: false, 
        contentType: false, 
        success:function(data){
            if(data.code==0){
                layer.close(index);
                handelRes(data);
                return !1;
            }
            
            if(!whiteWebSdk){
                whiteWebSdk = new WhiteWebSdk();
            }
            
            // roomToken 鉴权使用
            var pptConverter = whiteWebSdk.pptConverter(""+_DATA.roominfo.roomtoken);
            getscencs();
            // 请求转码，获得每一个页面的数据
            async function getscencs(){
                var res = await pptConverter.convert({
                    // 需要进行转换资源的网络地址，请确保可以正常访问
                    url: data.data.url,
                    // 转换类型
                    kind: "static", 
                    // 转换进度监听
                    onProgressUpdated: progress => {
                      // console.log(progress);
                    },
                    checkProgressInterval: 1500,
                    checkProgressTimeout: 5 * 60 * 1000,
                });
                layer.close(index);
                // console.log(res);
                var file_uuid=res.uuid;
                $.ajax({
                    type: "POST",
                    url:'/teacher/liveing/upfileuuid',
                    data:{courseid:courseid,lessonid:lessonid,file_uuid:file_uuid},
                    error: function(request)
                    {
                        layer.msg("数据请求失败");
                    },
                    success: function(data)
                    {
                    }
                })
                
                whiteroom.file_uuid=file_uuid; //文档转图片的唯一id
                whiteroom.putScenes('/'+file_uuid, res.scenes);
                whiteroom.setScenePath('/'+file_uuid+'/'+res.scenes[0].name);
                
                addPptPage();
               
            }
        },error(){

        }
    })
}

/**PPT等文档翻页 */
function pageNext(){
    
    var page=parseInt(whiteroom.state.sceneState.index)+1;
    var maxpages=whiteroom.state.sceneState.scenes.length;
    
    //if(whiteroom.state.sceneState.scenePath=='/init'){}
    if(page+1 >  maxpages ){
        layer.msg('已经到最后一页了');
    }else{
        // whiteroom.setSceneIndex(pages);
        whiteroom.pptNextStep(); // 下一步（下一页）
        upPage();
    }
}
function pageTop(){
    
    var page=parseInt(whiteroom.state.sceneState.index)+1;
    
    if(page==1){
        layer.msg('已经到第一页了');
    }else{
        
        whiteroom.pptPreviousStep() // 上一步（上一页）
        upPage();
    }
    
}


function backWhite(){
    whiteroom.setScenePath('/init');
    addPagePpt();
}
function backWhitePpt(){
    whiteroom.setScenePath('/'+whiteroom.file_uuid+'/1');
    whiteroom.setSceneIndex(0);
    addPptPage();
    
}
function addPagePpt(){
    
    $('.ppt_preview').removeClass('on');
    
    $('#whiteboard').find('.whiteboard_page').remove();
    $('#whiteboard').find('.whiteboard_page_ppt').remove();
     
    var html='<div class="whiteboard_page_ppt">\
                <a href="javascript:void(0)"><img class="whiteboard_page_white" onclick="backWhitePpt()" src="/static/teacher/images/white/white.png"></a>\
            </div>';

    $('#whiteboard').append(html);
}
function hidePagePpt(){
    $('.ppt_preview').removeClass('on');
    
    $('#whiteboard').find('.whiteboard_page').remove();
    $('#whiteboard').find('.whiteboard_page_ppt').remove();
}
function addPptPage(){
    
    $('.ppt_preview').removeClass('on');
    
    $('#whiteboard').find('.whiteboard_page').remove();
    $('#whiteboard').find('.whiteboard_page_ppt').remove();

    var page=parseInt(whiteroom.state.sceneState.index)+1;

    var maxpages=whiteroom.state.sceneState.scenes.length;
    var html='<div class="whiteboard_page">\
                <a href="javascript:void(0)"><img class="whiteboard_page_left" onclick="pageTop()" src="/static/teacher/images/white/left.png"></a>\
                <a href="javascript:void(0)" class="whiteboard_preview" onclick="pptpreview(1)" ><img  src="/static/teacher/images/white/ppt_preview.png">\
                <span class="whiteboard_page_1">'+page+'</span>\
                <span class="whiteboard_page_2">/</span>\
                <span class="whiteboard_page_3">'+maxpages+'</span></a>\
                <a href="javascript:void(0)"><img class="whiteboard_page_right" onclick="pageNext()" src="/static/teacher/images/white/right.png"></a>\
                <a href="javascript:void(0)"><img class="whiteboard_page_white" onclick="backWhite()" src="/static/teacher/images/white/white.png"></a>\
            </div>';

    $('#whiteboard').append(html);
}

function upPage(){
    var index=parseInt(whiteroom.state.sceneState.index);
    var page=index+1;
    var maxpages=whiteroom.state.sceneState.scenes.length;
    
    $('.whiteboard_page_1').text(page);
    $('.whiteboard_page_3').text(maxpages);
    
    if(!$('.ppt_preview').is(":hidden")){
        $('.ppt_preview').find('.ppt_preview_m ul li').removeClass('on').eq(index).addClass('on');
    }
}

function pptpreview(type=0){
    if(type==1){
        if($('.ppt_preview').hasClass("on")){
            $('.ppt_preview').removeClass('on');
            return !1;
        }
    }
    var sceneState=whiteroom.state.sceneState;
    console.log(sceneState);
    var list=sceneState.scenes;
    var index=sceneState.index;
    var nums=list.length;
    var html='';
    for(var i=0;i<nums;i++){
        var v=list[i];
        var n=i+1;
        var css='';
        if(index==i){
            css="on";
        }
        html+='<li class="'+css+'" data-page="'+i+'" data-path="/'+whiteroom.file_uuid+'/'+v.name+'">\
                    <div class="ppt_nums">'+n+'</div>\
                    <div class="ppt_view"><img src="'+v.ppt.src+'"></div>\
                    <div class="ppt_btn">\
                        <span class="ppt_btn_del">X</span>\
                    </div>\
                </li>';
    }
    
    $('.ppt_preview').find('.ppt_preview_m ul').html(html);
    $('.ppt_preview').addClass("on");
}




















