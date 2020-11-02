    function handelRes(data){
        if(data.url!=''){
            layer.msg(data.msg,{},function(){
                location.href=data.url;
            });
        }else{
            layer.msg(data.msg);
        }
    }
    
    function nodejsInit(){
        $.ajax({
            url:'/student/liveing/setNodeInfo',
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
        var client = AgoraRTC.createClient({mode: 'live', codec: "h264"});

        rtc.client=client;

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
            console.log('本地推流成功了');
            var remoteStream = evt.stream;
            var id = remoteStream.getId();
            Linkmic.getLinkInfo(id,remoteStream);

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
                if( _DATA.roominfo.user_type!=1){ //如果你不是老师就接受流
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
    };
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
                $('.body_left_bottom_top_c_img').eq(1).attr('src','/static/student/images/white/pencil1.png');
                whiteinfo.strokeWidth=4;
                whiteinfo.strokeColor=[52, 68, 90];
                whiteinfo.textSize=15;
                whiteinfo.currentApplianceName='pencil';
            }
            window.addEventListener("resize", refreshViewSize);
            
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

            rtc.client.publish(localStream, function (err) { //开始推流
                layer.msg('本地推流失败请重新进入房间进行推流');
                console.log("publish failed");
                console.error(err);
            })
        }, function (err) {
            layer.msg('请检查麦克风和摄像头是否正常');
            console.error("init local stream failed ", err);

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
        Exam.init();
        Robans.init();
        Student.init();
        Linkmic.init();
        SendMsg.init();
        Know.init();
        Praise.init();
    
        //非主播直接进入
        if(_DATA.roominfo.user_type!=1){
            joinWhite();
            
            joinAgora();
        }
        // joinWhite();
        //修改禁言状态
        if(_DATA.roominfo.isshup==0){
            $(":checkbox[id='stopspeak']").prop("checked",false);
        }else{
            $(":checkbox[id='stopspeak']").prop("checked",true);
        }
    }
    
    /* 课件处理 */
    var Ware={
        js_ware:$('#js_ware'),
        classfile:$('.classfile'),
        init:function(){
            var _this=this;
            _this.js_ware.on('click',function(){
                _this.getWare();
            })
        
            //点击关闭课件列表
             _this.classfile.on('click','.classfilen_top_close',function(){
                _this.classfile.hide();
            })
        },
        getWare:function(){
            $.ajax({
                type: "POST",
                url:'/student/liveing/getWare',
                data:{liveuid:_DATA.teacherinfo.id,courseid:courseid,lessonid:lessonid},
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
                                        <a style="color:#38DAA6" target="_blank" href="'+v.url+'"><span data-url="'+v.url+'" data-name="'+v.name+'">下载</span></a>&nbsp;&nbsp;\
                                    </div>\
                                </div>';
                    }
                    
                    $('.classfilen_bottom_list').html(html);
                    $('.classfile').show();
                }
            })
        },
        downWare:function(){
            
        }
    }
    
    /* 课堂测试 */
    var Exam={
        test_button:$('.test_button'),
        body_right_test_p:$('.body_right_test_p'),
        body_right_test_x:$('.body_right_test_x'),
        body_right_test_x_answer:$('.body_right_test_x_answer'),
        body_right_test_p_answer:$('.body_right_test_p_answer'),
        body_right_send_test:$('.body_right_send_test'),
        body_right_speak_tips_test_close:$('.body_right_speak_tips_test_close'),


        body_right_speak_tips_practice:$('.body_right_speak_tips_practice'),
        body_right_test_practice:$('.body_right_test_practice'),
        body_right_test_practice_li_right_border_x:$('.body_right_test_practice_li_right_border_x'),
        body_right_speak_tips_practice_close:$('.body_right_speak_tips_practice_close'),



        practice_wait_top_close:$('.practice_wait_top_close'),
        body_right_speak_tips_practice_wait_li:$('.body_right_speak_tips_practice_wait_li'),

        question_show:$('.question_show'),
        init:function(){
            var _this=this;
            _this.test_button.on('click',function(){ //点击测试

                if(exam_info._method_ == 'exam'){
                    _this.examTest();
                }else{
                    _this.practiceTest();
                }


            })

            _this.body_right_test_x_answer.on('click','.body_right_test_x_e',function(){ //做选择题
                var that = $(this);

                if(exam_info.isover){
                    return ;
                }
                var type = that.data('type');
                var result = that.data('result');

                var has = that.hasClass('body_right_test_ok_select');
                if(has){
                    if(type==1){ //单选题
                        exam_info.rs_user = '';
                    }else{ //多选题

                        var oldanswer = exam_info.rs_user;

                        var arr = oldanswer.split(',');
                        var str = '';
                        for(var i=0;i<arr.length;i++){
                            if(arr[i]!=result){
                                str+=arr[i]+',';
                            }
                        }
                        var str = str.substr(0,(str.length)-1);
        
                        exam_info.rs_user = str;
                    }
                    that.removeClass('body_right_test_ok_select');
                }else{
                    if(type==1){ //单选题
                        that.parent().siblings().find('.body_right_test_x_e').removeClass('body_right_test_ok_select');
                        exam_info.rs_user = ''+result;
                    }else{ //多选题
                        if(exam_info.rs_user !==''){
                            exam_info.rs_user = exam_info.rs_user+','+result;
                        }else{
                            exam_info.rs_user = ''+result;
                        }
                    }
                    that.addClass('body_right_test_ok_select');
                }

            })

            _this.body_right_test_p_answer.on('click','.body_right_test_p_x',function(){ //做判断
                var that = $(this);


                if(exam_info.isover){
                    return ;
                }
                var result = that.data('result');
                var has = that.hasClass('body_right_test_ok_select');
                if(has){
                    that.removeClass('body_right_test_ok_select');
                    exam_info.rs_user = '';
                }else{

                    that.siblings().removeClass('body_right_test_ok_select');
                    that.addClass('body_right_test_ok_select');
                    exam_info.rs_user = result;
                }

            })
            _this.body_right_send_test.on('click',function(){ //点击提交
                var that = $(this);

                if(exam_info._method_ == 'exam'){ //随堂测试
                    _this.examSubmit();
                    that.parent().addClass('display_none');
                }else{ //课堂练习
                    _this.practiceSubmit(1);
                }


                exam_info.isover = true;
            })

            _this.body_right_speak_tips_test_close.on('click',function(){ //学生点击关闭
                _this.showMsg();
            })


            _this.body_right_test_practice.on('click','.body_right_test_practice_li_right_border_x',function(){ //课堂练习做选择题
                var that = $(this);

                if(exam_info.isover == 1 || exam_info.isover == 2){
                    return ;
                }
                var type = that.data('type');
                var value = that.data('value');
                var k = that.data('k');



                var has = that.hasClass('body_right_test_practice_ok_select');
                if(has){
                    if(type==1){ //单选题
                        practiceInfo[k] = '';
                    }else{ //多选题

                        var oldanswer = practiceInfo[k];

                        var arr = oldanswer.split(',');
                        var str = '';
                        for(var i=0;i<arr.length;i++){
                            if(arr[i]!=value){
                                str+=arr[i]+',';
                            }
                        }
                        var str = str.substr(0,(str.length)-1);
        
                        practiceInfo[k] = str;
                    }
                    that.removeClass('body_right_test_practice_ok_select');
                }else{
                    if(type==1){ //单选题

                        that.parent().siblings().find('.body_right_test_practice_li_right_border_x').removeClass('body_right_test_practice_ok_select');
                        practiceInfo[k] = ''+value;
                    }else{ //多选题
                        if(practiceInfo[k]){
                            practiceInfo[k] = practiceInfo[k]+','+value;
                        }else{
                            practiceInfo[k] = ''+value;
                        }
                    }
                    that.addClass('body_right_test_practice_ok_select');
                }
            })
            _this.body_right_test_practice.on('click','.body_right_test_practice_li_right_pan',function(){ //课堂练习做判断
                var that = $(this);

                if(exam_info.isover == 1 || exam_info.isover == 2){
                    return ;
                }

                var value = that.data('value');
                var k = that.data('k');

                var has = that.hasClass('body_right_test_practice_ok_select');
                if(has){
                    that.removeClass('body_right_test_practice_ok_select');
                    practiceInfo[k] = '';
                }else{
                    that.siblings().removeClass('body_right_test_practice_ok_select');
                    that.addClass('body_right_test_practice_ok_select');
                    practiceInfo[k] = value;
                }

            })
            
            _this.body_right_test_practice.on('input propertychange','.body_right_test_practice_li_right_t_input',function(){ //做填空题
                var that = $(this);

                if(exam_info.isover == 1 || exam_info.isover == 2){
                    return ;
                }


                var value = that.val();
                var k = that.parent().data('k');
                var key = that.parent().data('key');
                if(practiceInfo[k]){
                    if(practiceInfo[k][key]){
                        practiceInfo[k][key] = value;
                    }else{
                        practiceInfo[k].push(value);
                    }
                    
                }else{
                    var obj = [];
                    obj.push(value);
                    practiceInfo[k] = obj;
                }
                
            })
            _this.body_right_speak_tips_practice_close.on('click',function(){ //学生点击关闭课堂练习
                _this.showMsg();
            })
        
            _this.practice_wait_top_close.on('click',function(){ //学生点击关闭等待和答题完的课堂练习
                _this.showMsg();
            })
            _this.body_right_speak_tips_practice_wait_li.on('click',function(){
                var index = $(this).index();
                $(this).addClass('body_right_test_practice_tian_text_ok');
                $(this).siblings().removeClass('body_right_test_practice_tian_text_ok');

                $(this).find('.body_right_speak_tips_practice_wait_li_heng').removeClass('display_none');
                $(this).siblings().find('.body_right_speak_tips_practice_wait_li_heng').addClass('display_none');

                $('.body_right_test_practice').empty();
                if(exam_info.isover==1){ //等待
                    if(index ==0){
                        var html = '<img class="body_right_test_practice_wait_img" src="../../static/student/images/white/practice_wait.png">\
                                    <div class="body_right_test_practice_wait_text">请耐心等待老师公布答案~</div>';

                        $('.body_right_test_practice').html(html);
                    }else{

                        var html = '<img class="body_right_test_practice_wait_img" src="../../static/student/images/white/practice_rank_wait.png">\
                                    <div class="body_right_test_practice_wait_text">排名统计中，请耐心等待~</div>';

                        $('.body_right_test_practice').html(html);
                    }

                }else if(exam_info.isover==2){ //出成绩
                    if(index ==0){ //看答题卡
                        _this.practiceHtml(practiceInfoOver.result);
                    }else{ //看排名
                        var html = '';
                        for(var i = 0;i<practiceList.length;i++){
                            var vo = practiceList[i];
                            var status = '<span class="body_right_test_practice_rank_1_text">'+vo.rank+'</span>';
                            if(vo.rank == 1){
                                status = '<img class="body_right_test_practice_rank_1_img" src="../../static/student/images/white/practice_rank1.png">';
                            }else if(vo.rank == 2){
                                status = '<img class="body_right_test_practice_rank_1_img" src="../../static/student/images/white/practice_rank2.png">';
                            }else if(vo.rank == 3){
                                status = '<img class="body_right_test_practice_rank_1_img" src="../../static/student/images/white/practice_rank3.png">';
                            }
                            html+='<div class="body_right_test_practice_rank">\
                                    <span class="body_right_test_practice_rank_1">'+status+'</span>\
                                    <span class="body_right_test_practice_rank_name line_one">'+vo.user_nickname+'</span>\
                                    <span class="body_right_test_practice_rank_fen">'+vo.score+'分</span>\
                                </div>';
                        }
                        _this.body_right_test_practice.append(html);

                    }
                }
            })
        },
        

        getExam:function(data){ //老师发布了随堂测验
            var _this = this;
            _this.test_button.removeClass('display_none');
            //如果之前有练习要隐藏覆盖
            if(exam_info._method_){
                _this.showMsg();
            }

            exam_info = data;
            exam_info.isover = false;
            exam_info.rs_user = '';
        },
        examTest:function(){ //随堂测试
            var _this = this;

            _this.showTest();
            $('.body_right_test_practice').empty();
            $('.body_right_test_practice').addClass('display_none');
            if(!exam_info.isover){
                $('#send_test').removeClass('display_none');
            }else{
                $('#send_test').addClass('display_none');
            }
            if(!exam_info.isover){
                _this.body_right_test_p_answer.empty();
                _this.body_right_test_x_answer.empty();
                $('.body_right_test_x_status').addClass('display_none');
                $('.body_right_test_p_status').addClass('display_none');
                if(exam_info.type == 0){ //判断题
                    _this.body_right_test_p.removeClass('display_none');
                    var html = '<span class="body_right_test_p_x" data-result="1">对</span><span class="body_right_test_p_x" data-result="0">错</span>';
                    _this.body_right_test_p_answer.append(html);
                }else{

                    _this.body_right_test_x.removeClass('display_none');
 
                    
                    var html = '';
                    for(var i =0;i<exam_info.nums;i++){
                        html+='<span class="body_right_test_x_e_span"><span class="body_right_test_x_e" data-type="'+exam_info.type+'" data-result="'+i+'">'+select_listj[i]+'</span></span>';
                    }
                    _this.body_right_test_x_answer.append(html);
                }
            }
        },
        examSubmit:function(){//随堂提交
            var _this = this;
            if(exam_info.rs_user===''){
                layer.msg('请选择答案');
                return ;
            }
            if(exam_info.type == 0){//判断题
                if(exam_info.rs == exam_info.rs_user){
                    $('.body_right_test_p_status').eq(0).removeClass('display_none');
                }else{
                    $('.body_right_test_p_x').eq(exam_info.rs).addClass('body_right_test_ok_select');
                    $('.body_right_test_p_x').eq(exam_info.rs_user).addClass('body_right_test_err_select');
                    $('.body_right_test_p_status').eq(1).removeClass('display_none');
                }
            }else{
                if(exam_info.type == 1){ //单选
                    if(exam_info.rs == exam_info.rs_user){
                        $('.body_right_test_x_status').eq(0).removeClass('display_none');
                    }else{
                        $('.body_right_test_x_e_span').eq(exam_info.rs).find('.body_right_test_x_e').addClass('body_right_test_ok_select');
                        $('.body_right_test_x_e_span').eq(exam_info.rs_user).find('.body_right_test_x_e').removeClass('body_right_test_ok_select');
                        $('.body_right_test_x_e_span').eq(exam_info.rs_user).addClass('body_right_test_err_select');
                        $('.body_right_test_x_status').eq(1).removeClass('display_none');
                    }
                }else{ //多选

                    var rs = exam_info.rs;
                    var rs_user = exam_info.rs_user;
                    rs = rs.split(',');
                    rs_user = rs_user.split(',');



                    var isT = true;
                    var newarr = [];
                    for(var y in rs_user){
                        var is = rs.indexOf(rs_user[y]); // 2
                        if(is>-1){
                            newarr.push({'isok':1,'i':rs_user[y]})
                        }else{
                            isT = false;
                            newarr.push({'isok':0,'i':rs_user[y]})
                        }
                    }


                    for(var i in rs){
                        $('.body_right_test_x_e_span').eq(rs[i]).find('.body_right_test_x_e').addClass('body_right_test_ok_select');
                    }

                    for(var i in newarr){
                        if(newarr[i].isok==0){
                            $('.body_right_test_x_e_span').eq(newarr[i].i).find('.body_right_test_x_e').removeClass('body_right_test_ok_select');
                            $('.body_right_test_x_e_span').eq(newarr[i].i).addClass('body_right_test_err_select');
                        }
                    }
                    if(isT == true){
                        $('.body_right_test_x_status').eq(0).removeClass('display_none');
                    }else{
                        $('.body_right_test_x_status').eq(1).removeClass('display_none');
                    }
                }
            }
            var msg = '{"msg":[{"_method_":"exam","action":3,"msgtype":"2","result":"'+exam_info.rs_user+'","timestamp":"","equipment":"pc","uid":"'+_DATA.userinfo.id+'","avatar":"'+_DATA.userinfo.avatar+'","user_nickname":"'+_DATA.userinfo.user_nickname+'","user_type":"'+_DATA.roominfo.user_type+'"}],"retcode":"000000","retmsg":"OK"}';
            Socket.emitData('broadcast',msg);	
        },
        endExam:function(){ //老师结束了随堂测验
            var _this = this;
            _this.showMsg();
            _this.test_button.addClass('display_none');
            exam_info = {};
        },
        getPractice:function(data){ //老师发布课堂练习

            var _this = this;
            _this.test_button.removeClass('display_none');
            //如果之前有练习要隐藏覆盖
            if(exam_info._method_){
                _this.showMsg();
            }

            data.list = JSON.parse(data.list); 
            exam_info = data;
            exam_info.isover = 0;
            var totalscore = 0;
            for(var i = 0;i<data.list.length;i++){
                totalscore = totalscore + parseInt(data.list[i].score);
            }
            
            practiceInfoOver.totalscore = totalscore;
            //开始答题倒计时
            practiceInvter = setInterval(function(){

                if(exam_info.times==0){
                    clearInterval(practiceInvter);
                    return ;
                }

                exam_info.times = exam_info.times-1;
                var text = _this.formatSeconds(exam_info.times);
                $('.body_right_speak_tips_practice_time').html(text);
            },1000)
        },
        practiceTest:function(){ //课堂练习
            var _this = this;

            practiceInfo = {};//课堂练习答题卡
            if(exam_info.isover == 0){ //还没有做题
                _this.showPractice();
                $('.body_right_test_x').addClass('display_none');
                $('.body_right_test_p').addClass('display_none');
                $('.practice_wait_top').addClass('display_none');
                $('.body_right_speak_tips_practice_wait').addClass('display_none');
                $('.body_right_speak_tips_practice').removeClass('display_none');
                $('.body_right_test_practice').removeClass('display_none');


                _this.body_right_test_practice.empty();
                var html = '';
                for(var i =0; i<exam_info.list.length;i++){
                    var vo = exam_info.list[i];
    
    
                    var content = ''
                    if(vo.type == 1 || vo.type == 2 || vo.type == 5){
                        for(var y=0;y<vo.nums;y++){
                            content+='<span class="body_right_test_practice_li_right_border">\
                                        <span class="body_right_test_practice_li_right_border_x" data-value="'+y+'" data-k="'+(i+1)+'" data-type="'+vo.type+'">'+select_listj[y]+'</span>\
                                    </span>';
                        }
                    }else if(vo.type == 0){ //判断题
                        content = '<span class="body_right_test_practice_li_right_pan" data-value="1" data-k="'+(i+1)+'" data-type="'+vo.type+'">对</span><span data-value="0" data-k="'+(i+1)+'" data-type="'+vo.type+'" class="body_right_test_practice_li_right_pan">错</span>'
                    }else{ //填空题
                        for(var y=0;y<vo.nums;y++){
                            content+='<div class="body_right_test_practice_li_right_t" data-k="'+(i+1)+'" data-key="'+y+'">\
                                        <span class="body_right_test_practice_li_right_t_i">'+(y+1)+'</span>\
                                        <input class="body_right_test_practice_li_right_t_input" type="text" value="">\
                                    </div>';
                        }
                    }
    
                    html+='<div class="body_right_test_practice_li">\
                            <div class="body_right_test_practice_li_left">\
                                <img class="body_right_test_practice_li_left_status display_none" src="../../static/student/images/white/ok.png">\
                                <img class="body_right_test_practice_li_left_status display_none" src="../../static/student/images/white/err.png">\
                                <span class="body_right_test_practice_li_left_i">'+(i+1)+'.</span>\
                            </div>\
                            <div class="body_right_test_practice_li_right">'+content+'</div>\
                        </div>';
                }
    
                _this.body_right_test_practice.append(html);
            }else if(exam_info.isover == 1){ //做完提交了，但没有出成绩
                _this.showPractice();
                $('.practice_wait_top').removeClass('display_none');
                $('.body_right_speak_tips_practice_wait').removeClass('display_none');
                $('.body_right_speak_tips_practice').addClass('display_none');
                $('#send_test').addClass('display_none');
                $('.body_right_test_practice').empty();

                var html = '<img class="body_right_test_practice_wait_img" src="../../static/student/images/white/practice_wait.png">\
                            <div class="body_right_test_practice_wait_text">请耐心等待老师公布答案~</div>';

                $('.body_right_test_practice').html(html);
                $('.body_right_speak_tips_practice_wait_li').eq(0).addClass('body_right_test_practice_tian_text_ok');
                $('.body_right_speak_tips_practice_wait_li').eq(1).removeClass('body_right_test_practice_tian_text_ok');

                $('.body_right_speak_tips_practice_wait_li').eq(0).find('.body_right_speak_tips_practice_wait_li_heng').removeClass('display_none');
                $('.body_right_speak_tips_practice_wait_li').eq(1).find('.body_right_speak_tips_practice_wait_li_heng').addClass('display_none');

                var text = '总分 '+practiceInfoOver.totalscore+'分'
                $('.practice_wait_top_content_total').html(text);
                $('.practice_wait_top_content_top_fen').html(0);
            }else{ //出成绩了
                _this.showPractice();
                $('.practice_wait_top').removeClass('display_none');
                $('.body_right_speak_tips_practice_wait').removeClass('display_none');
                $('.body_right_speak_tips_practice').addClass('display_none');
                $('#send_test').addClass('display_none');
                $('.body_right_test_practice').empty();


                $('.body_right_speak_tips_practice_wait_li').eq(0).addClass('body_right_test_practice_tian_text_ok');
                $('.body_right_speak_tips_practice_wait_li').eq(1).removeClass('body_right_test_practice_tian_text_ok');

                $('.body_right_speak_tips_practice_wait_li').eq(0).find('.body_right_speak_tips_practice_wait_li_heng').removeClass('display_none');
                $('.body_right_speak_tips_practice_wait_li').eq(1).find('.body_right_speak_tips_practice_wait_li_heng').addClass('display_none');

                var text = '总分 '+practiceInfoOver.totalscore+'分'
                $('.practice_wait_top_content_total').html(text);
                _this.practiceHtml(practiceInfoOver.result);
            }

            if(exam_info.type==1){
                _this.question_show.show();
                _this.question_show.find('ul').empty();
                let list=JSON.parse(exam_info.q);
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
                            let name=select_listj && select_listj[m] ? select_listj[m] : '';
                            select2+='<div class="li_item">'+name+'.'+ans[m]+'</div>';
                        }
                    }


                    html+='<li data-id="'+v.id+'">\n' +
                        '                <div class="li_l">\n' +
                        '                    <div class="li_l_t">'+num+'.<span>'+type_listj[type]+'</span> '+v.title+'</div>\n' +
                        select2 +
                        '                </div>\n' +
                        '                <div class="li_r">\n' +
                        '                </div>\n' +
                        '            </li>';
                }
                _this.question_show.find('ul').html(html);
            }

        },
        practiceSubmit:function(status){ //课堂练习提交
            var _this = this;
            var result = JSON.stringify(practiceInfo);

            if(status == 1 && exam_info.isover!=0){
                return ;
            }
            if(status==2){ 

            }
            if(exam_info.isover==1){ //证明已经提交答案了，需要去获取排名
                exam_info.isover = 2;
                _this.practiceGetgrade();
                return ;
            }else if(exam_info.isover==2){
                _this.practiceTest();
                return ;
            }
            $.ajax({
                type: "POST",
                url:'/student/liveing/getSign',
                data:{liveuid:_DATA.teacherinfo.id,courseid:courseid,lessonid:lessonid,result:result},
                dataType:'json',
                success:function(data){
                    $.ajax({
                        type: "GET",
                        url:__SITEURL__+'/api/?s=Exam.SetScore',
                        data:{uid:userinfoj.id,token:userinfoj.token,liveuid:_DATA.teacherinfo.id,courseid:courseid,lessonid:lessonid,result:result,sign:data.data},
                        dataType:'json',
                        success:function(data){
                            if(data.data.code!=0){
                                layer.msg(data.data.msg);
                            }else{
                                exam_info.isover = status;
                                var totalscore = practiceInfoOver.totalscore;
                                practiceInfoOver = data.data.info[0];
                                practiceInfoOver.totalscore = totalscore;
                                if(status==2){
                                    _this.practiceGetgrade();
                                }else{
                                    _this.practiceTest();
                                }

                                var msg = '{"msg":[{"_method_":"practice","action":3,"msgtype":"2","timestamp":"","equipment":"pc","uid":"'+_DATA.userinfo.id+'","avatar":"'+_DATA.userinfo.avatar+'","user_nickname":"'+_DATA.userinfo.user_nickname+'"}],"retcode":"000000","retmsg":"OK"}';
                                Socket.emitData('broadcast',msg);	
                            }
                        }
                    })
                }
            })



        },
        practiceGetgrade:function(){

            var _this = this;
            $.ajax({
                type: "GET",
                url:__SITEURL__+'/api/?s=Exam.GetRank',
                data:{uid:userinfoj.id,token:userinfoj.token,liveuid:_DATA.teacherinfo.id,courseid:courseid,lessonid:lessonid},
                dataType:'json',
                success:function(data){
                    var text = '当前排名第<span style="font-size:20px">'+data.data.info[0].rank+'</span>名，击败了'+data.data.info[0].out+'%的学生';
                    $('.practice_wait_top_tips').html(text);
                    $('.practice_wait_top_content_top_fen').html(practiceInfoOver.score);

                    //获取排名信息
                    $.ajax({
                        type: "GET",
                        url:__SITEURL__+'/api/?s=Exam.GetList',
                        data:{uid:userinfoj.id,token:userinfoj.token,liveuid:_DATA.teacherinfo.id,courseid:courseid,lessonid:lessonid},
                        dataType:'json',
                        success:function(data){
                            practiceList = data.data.info;
                            _this.practiceTest();
                        }
                    })

                }
            })
        },
        practiceHtml:function(data){

            var _this = this;
            var html = '';
            console.log(data);
            for(var i =0; i<data.length;i++){
                var vo = data[i];
                var content = ''
                if(vo.type == 1 || vo.type == 2 || vo.type == 5){
                    var status = '';
                    if(vo.rs_user.isok == 1){
                        status = '<img class="body_right_test_practice_li_left_status" src="../../static/student/images/white/ok.png">';
                    }else{
                        status = '<img class="body_right_test_practice_li_left_status" src="../../static/student/images/white/err.png">';
                    }
                    for(var y=0;y<vo.nums;y++){
                        var ok_status = '';
                        var err_status = '';
                        if(vo.rs_user.isok==1){
                            if(vo.rs.indexOf(''+y)>-1){
                                ok_status = 'body_right_test_practice_ok_select';
                            }
                        }else{
                            
                            if(vo.rs.indexOf(''+y)>-1){
                                ok_status = 'body_right_test_practice_ok_select';
                            }else{
                                if(vo.rs_user.rs.indexOf(''+y)>-1){
                                    err_status = 'body_right_test_practice_err_select';
                                }

                            }
                        }


                        content+='<span class="body_right_test_practice_li_right_border '+err_status+'">\
                                    <span class="body_right_test_practice_li_right_border_x '+ok_status+'">'+select_listj[y]+'</span>\
                                </span>';
                    }
                }else if(vo.type == 0){ //判断题

                    var status = '';
                    if(vo.rs_user.isok == 1){
                        status = '<img class="body_right_test_practice_li_left_status" src="../../static/student/images/white/ok.png">';
                    }else{
                        status = '<img class="body_right_test_practice_li_left_status" src="../../static/student/images/white/err.png">';
                    }

                    var ok_status = '';
                    var err_status = '';
                    if(vo.rs_user.isok==1){
                        if(vo.rs == 1){
                            ok_status = 'body_right_test_practice_ok_select';
                        }else{
                            err_status = 'body_right_test_practice_ok_select';
                        }
                    }else{
                        if(vo.rs == 1){
                            ok_status = 'body_right_test_practice_err_select';
                            err_status = 'body_right_test_practice_ok_select';
                        }else{
                            ok_status = 'body_right_test_practice_ok_select';
                            err_status = 'body_right_test_practice_err_select';
                        }
                    }   
                    content = '<span class="body_right_test_practice_li_right_pan '+ok_status+'">对</span><span class="body_right_test_practice_li_right_pan '+err_status+'">错</span>'
                }else{ //填空题
                    var status = '';
                    if(vo.rs_user.isok == 1){
                        status = '<img class="body_right_test_practice_li_left_status" src="../../static/student/images/white/ok.png">';
                    }else{
                        status = '<img class="body_right_test_practice_li_left_status" src="../../static/student/images/white/err.png">';
                    }
                    for(var y=0;y<vo.nums;y++){
                        var ok_status = '';
                        var ok_status_heng = '';
                        if(vo.rs_user.rs[y].isok == 1){
                            ok_status = 'body_right_test_practice_tian_ok';
                            ok_status_heng = 'body_right_test_practice_tian_text_ok';
                        }else{
                            ok_status = 'body_right_test_practice_tian_err';
                            ok_status_heng = 'body_right_test_practice_tian_text_err';
                        }
                        content+='<div class="body_right_test_practice_li_right_t">\
                                    <span class="body_right_test_practice_li_right_t_i '+ok_status+'">'+(y+1)+'</span>\
                                    <input disabled class="body_right_test_practice_li_right_t_input '+ok_status_heng+'" type="text" value="'+vo.rs_user.rs[y].rs+'">\
                                </div>';
                    }
                    content+='<div class="body_right_test_practice_li_right_t_text">【正确答案】</div>';
                    for(var y=0;y<vo.rs.length;y++){
                        for(var x=0;x<vo.rs[y].length;x++){
                            var g = '';
                            var h = '';
                            if(x==0){
                                g = (y+1)+'.';
                            }else{
                                h = 'body_right_test_practice_li_right_t_an_left'
                            }
                            content+='<div class="body_right_test_practice_li_right_t_an">'+g+'<span class="'+h+'">'+vo.rs[y][x]+'</span></div>'
                        }
                        
                    }

                }

                html+='<div class="body_right_test_practice_li">\
                        <div class="body_right_test_practice_li_left">'+status+'<span class="body_right_test_practice_li_left_i">'+(i+1)+'.</span>\
                        </div>\
                        <div class="body_right_test_practice_li_right">'+content+'</div>\
                    </div>';
            }

            _this.body_right_test_practice.append(html);
        },
        endPractice:function(){ //老师结束了课堂练习
            var _this = this;
            _this.showMsg();
            _this.test_button.addClass('display_none');
            exam_info = {};
            _this.question_show.hide();
        },
        formatSeconds:function(value) {

            var theTime = parseInt(value);// 秒
            var middle= 0;// 分

            if(theTime > 60) {
                middle= parseInt(theTime/60);
                theTime = parseInt(theTime%60);
            }
            var result = ""+parseInt(theTime)+"秒";
            if(middle > 0) {
                result = ""+parseInt(middle)+"分"+result;
            }
            return result;
        },

        showMsg:function(){  //需要展示聊天时的js操作
            var _this = this;
            if($('.body_right_speak_tips_talk').hasClass('msg_active')){
                $('.body_right_speak').removeClass('display_none');
                $('#send_msg').removeClass('display_none');
            }else{
                $('.body_right_question').removeClass('display_none');
                $('#send_question').removeClass('display_none');
            }
            $('.practice_wait_top').addClass('display_none');
            $('.body_right_speak_tips_msg').removeClass('display_none');
            $('.body_right_speak_tips_test').addClass('display_none');
            $('.body_right_speak_tips_practice').addClass('display_none');
            $('.body_right_speak_tips_practice_wait').addClass('display_none');
            $('.body_right_test').addClass('display_none');
            $('#send_test').addClass('display_none');
            _this.question_show.hide();
        },
        showTest:function(){  //需要展示随堂测试的js操作

            var _this = this;
            $('.practice_wait_top').addClass('display_none');
            $('.body_right_speak_tips_msg').addClass('display_none');
            $('.body_right_speak_tips_test').removeClass('display_none');
            $('.body_right_speak_tips_practice').addClass('display_none');
            $('.body_right_speak_tips_practice_wait').addClass('display_none');
            $('.body_right_speak').addClass('display_none');
            $('.body_right_question').addClass('display_none');
            $('.body_right_test').removeClass('display_none');

            

            $('#send_msg').addClass('display_none');
            $('#send_question').addClass('display_none');
            $('#send_test').removeClass('display_none');
            _this.question_show.hide();

        },
        showPractice:function(){  //需要展示课堂练习的js操作
            $('.body_right_speak_tips_msg').addClass('display_none');
            $('.body_right_speak_tips_test').addClass('display_none');
            $('.body_right_speak').addClass('display_none');
            $('.body_right_question').addClass('display_none');
            $('.body_right_test').removeClass('display_none');



            $('#send_msg').addClass('display_none');
            $('#send_question').addClass('display_none');
            $('#send_test').removeClass('display_none');
        },
    }
    /* 抢答题 */
    var Robans={
        rob_body:$('.rob_body'),
        rob_body_content_rob:$('.rob_body_content_rob'),
        init:function(){
            var _this=this;
            _this.rob_body.on('click','.rob_body_content_rob',function(){ //点击抢答
                if($('.rob_body_content_rob').hasClass('rob_body_content_rob_over')){
                    return ;
                }
                $.ajax({
                    type: "GET",
                    url:__SITEURL__+'/api/?s=Exam.Rob',
                    data:{uid:userinfoj.id,token:userinfoj.token,liveuid:_DATA.teacherinfo.id,courseid:courseid,lessonid:lessonid},
                    dataType:'json',
                    success:function(data){
                        $('.rob_body_content_rob').addClass('rob_body_content_rob_over');
                        if(data.data.code != 0){
                            layer.msg(data.data.msg);
                        }else{ //抢到了发socket
                            var msg = '{"msg":[{"_method_":"rob","action":3,"msgtype":"2","timestamp":"","equipment":"pc","uid":"'+_DATA.userinfo.id+'","avatar":"'+_DATA.userinfo.avatar+'","user_nickname":"'+_DATA.userinfo.user_nickname+'"}],"retcode":"000000","retmsg":"OK"}';
                            Socket.emitData('broadcast',msg);	
                        }
                    }
                })

            })

            _this.rob_body.on('click','.rob_body_content_top_close',function(){ //放弃抢答
                _this.endRob();
            })

            
        },
        startRob:function(){ //老师发布了抢答
            var _this = this;
            _this.rob_body.removeClass('display_none');
            _this.rob_body.empty();
            html = '<div class="rob_body_content">\
                        <div class="rob_body_content_top">\
                            <img class="rob_body_content_top_close" src="../../static/student/images/white/close_white.png">\
                            <div class="rob_body_content_top_text">抢答</div>\
                        </div>\
                        <div class="rob_body_content_middle">\
                            <div class="rob_body_content_middle_li">\
                                <img class="rob_body_content_middle_li_img" src="../../static/student/images/white/rob_wait.png">\
                                <div class="rob_body_content_middle_li_text line_one">等待抢答</div>\
                            </div>\
                            <div class="rob_body_content_middle_li">\
                                <img class="rob_body_content_middle_li_img" src="../../static/student/images/white/rob_wait.png">\
                                <div class="rob_body_content_middle_li_text line_one">等待抢答</div>\
                            </div>\
                            <div class="rob_body_content_middle_li">\
                                <img class="rob_body_content_middle_li_img" src="../../static/student/images/white/rob_wait.png">\
                                <div class="rob_body_content_middle_li_text line_one">等待抢答</div>\
                            </div>\
                        </div>\
                        <button class="rob_body_content_rob">我要抢答</button>\
                    </div>';
            _this.rob_body.append(html);
        },
        haveRob:function(data){ //有人抢到了

            var _this = this;
            if(_this.rob_body.hasClass('display_none') || robnums == 3){
                return ;
            }
            $('.rob_body_content_middle_li').eq(robnums).find('.rob_body_content_middle_li_img').attr('src',data.avatar);
            $('.rob_body_content_middle_li').eq(robnums).find('.rob_body_content_middle_li_text').html(data.user_nickname);
            robnums = robnums+1;

            if(robnums==3){
                $('.rob_body_content_rob').addClass('rob_body_content_rob_over');
            }

        },
        endRob:function(){ //结束抢答
            var _this = this;
            _this.rob_body.addClass('display_none');
            _this.rob_body.empty();
            robnums = 0;
        }

    }

    /* 懂不懂 */
    var Know={
        know_body:$('.know_body'),
        know_body_content_bottom_ok:$('.know_body_content_bottom_ok'),
        know_body_content_bottom_no:$('.know_body_content_bottom_no'),
        init:function(){
            var _this=this;
            _this.know_body_content_bottom_ok.on('click',function(){ //点击懂了

                var msg = '{"msg":[{"_method_":"know","action":3,"isknow":"1","msgtype":"2","timestamp":"","equipment":"pc","uid":"'+_DATA.userinfo.id+'","avatar":"'+_DATA.userinfo.avatar+'","user_nickname":"'+_DATA.userinfo.user_nickname+'"}],"retcode":"000000","retmsg":"OK"}';
                Socket.emitData('broadcast',msg);	
                _this.endKnow();
            })

            _this.know_body_content_bottom_no.on('click',function(){ //点击没懂

                var msg = '{"msg":[{"_method_":"know","action":3,"isknow":"0","msgtype":"2","timestamp":"","equipment":"pc","uid":"'+_DATA.userinfo.id+'","avatar":"'+_DATA.userinfo.avatar+'","user_nickname":"'+_DATA.userinfo.user_nickname+'"}],"retcode":"000000","retmsg":"OK"}';
                Socket.emitData('broadcast',msg);	
                _this.endKnow();
            })
        },
        startKnow:function(){ //老师发布了抢答
            var _this = this;
            _this.know_body.removeClass('display_none');
        },
        endKnow:function(){ //结束抢答
            var _this = this;
            _this.know_body.addClass('display_none');
        }

    }

    /* 表扬 */
    var Praise={
        praise_body:$('.praise_body'),
        praise_body_content_close:$('.praise_body_content_close'),
        praise_body_content_text_name:$('.praise_body_content_text_name'),
        init:function(){
            var _this=this;
            _this.praise_body_content_close.on('click',function(){ //点击关闭表扬
                _this.endPraise();
            })

        },
        startPraise:function(data){ //老师表扬了
            var _this = this;
            _this.praise_body.removeClass('display_none');
            _this.praise_body_content_text_name.html(data.toname);
        },
        endPraise:function(){ //关闭表扬
            var _this = this;
            _this.praise_body.addClass('display_none');
        }

    }
    
    /* 学生列表 */
    var Student={
        student_list:$('.student_list'),
        js_student_btn:$('.js_student_btn'),
        js_student_hand:$('.js_student_hand'),

        body:$('.body'),
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
                url:'/student/liveing/getUserLists',
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
                        
                            
                            
                        if(v.type==1){
                            html+='<div class="studentlist_bottom_list_li_status"><img class="studentlist_bottom_list_li_status_m" src="/static/student/images/white/icon_live_mic_open.png"></div>';
                            html+='<div class="studentlist_bottom_list_li_status"><img class="studentlist_bottom_list_li_status_v" src="/static/student/images/white/icon_live_camera_open.png"></div>';
                            html+='<div class="studentlist_bottom_list_li_edit"><img class="studentlist_bottom_list_li_status_b" src="/static/student/images/white/icon_live_stage_up.png"></div>';
                        }else{
                            html+='<div class="studentlist_bottom_list_li_status"><img class="studentlist_bottom_list_li_status_m" src="/static/student/images/white/icon_live_mic_close.png"></div>';
                            html+='<div class="studentlist_bottom_list_li_status"><img class="studentlist_bottom_list_li_status_v" src="/static/student/images/white/icon_live_camera_close.png"></div>';
                            html+='<div class="studentlist_bottom_list_li_edit"><img class="studentlist_bottom_list_li_status_b" src="/static/student/images/white/icon_live_stage_down.png"></div>';
                        }
                    
                            html+='</div>';
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
        Linkmic:function(touid,type){
            var _this=this;
            $.ajax({
                type: "POST",
                url:'/student/liveing/setLinkmic',
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
        },

        
    };

    /* 连麦 */
    var Linkmic={
        list:$('.linkmic_list'),
        body_left_bottom_bottom_hand:$('.body_left_bottom_bottom_hand'), //举手
        body_left_bottom_bottom_hand1:$('.body_left_bottom_bottom_hand1'), //已经举手
        body_left_bottom_bottom_hand2:$('.body_left_bottom_bottom_hand2'), //下麦
        body_left_bottom_top_button:$('.body_left_bottom_top_button'),
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

            _this.list.on('click','.camera',function(){
                var _that=$(this);
                _this.setCamera(_that);
             });

             _this.body_left_bottom_bottom_hand.click(function(){ //举手
                var _that=$(this);
                _this.ApplyLink(_that);
             });

             _this.body_left_bottom_bottom_hand1.click(function(){ //取消举手
                var _that=$(this);

                _that.hide();
                _this.body_left_bottom_bottom_hand.show();
                var msg = '{"msg":[{"_method_":"LinkMic","uid":"'+_DATA.userinfo.id+'","action":"9","avatar":"'+_DATA.userinfo.avatar+'","uname":"'+_DATA.userinfo.user_nickname+'","sex":"0"}],"retcode":"000000","retmsg":"OK"}';
                Socket.emitData('broadcast',msg);
             });

             _this.body_left_bottom_bottom_hand2.click(function(){ //学生下麦
                var _that=$(this);

                _that.hide();
                _this.body_left_bottom_bottom_hand.show();
                _this.downLink();
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
                url:'/student/liveing/getLinkInfo',
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
                        _that.click(function(){
                            console.log('点击播放');
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
                        })
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
                _that.parents('.list_li').find('list_li_bg').addClass('on');
                action=3;
            }else{
                _that.addClass('on');
                _that.parents('.list_li').find('list_li_bg').removeClass('on');
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
        },
        /******学生上麦的一些操作 */
        ApplyLink:function(_that){
            var _this = this;
            $.ajax({
                type: "POST",
                url:__SITEURL__+'/api/?s=Linkmic.ApplyLink',
                data:{uid:userinfoj.id,token:userinfoj.token,liveuid:_DATA.teacherinfo.id,stream:stream},
                dataType:'json',
                error: function(request)
                {
                    layer.msg("数据请求失败");
                },
                success: function(data)
                {

                    layer.msg(data.data.msg);
                    if(data.data.code==0){
                        _that.hide();
                        _this.body_left_bottom_bottom_hand1.show();
                        var msg = '{"msg":[{"_method_":"LinkMic","uid":"'+_DATA.userinfo.id+'","action":"1","avatar":"'+_DATA.userinfo.avatar+'","uname":"'+_DATA.userinfo.user_nickname+'","sex":"0"}],"retcode":"000000","retmsg":"OK"}';
                        Socket.emitData('broadcast',msg);
                    }
                }
            })
        },
        startPush(){
            var _this = this;
            Wind.css('layer');
            Wind.use('layer',function(){
                stratCheck();
            });
            _this.body_left_bottom_bottom_hand2.show();
            _this.body_left_bottom_bottom_hand1.hide();
            _this.body_left_bottom_bottom_hand.hide();
        },
        noLink:function(){
            var _this = this;

            _this.body_left_bottom_bottom_hand.show();
            _this.body_left_bottom_bottom_hand1.hide();
            _this.body_left_bottom_bottom_hand2.hide();
        },
        downLink:function(){
            var _this = this;

            whiteroom.setWritable(false).then(function() { //停止操作白板
                $('#caozuo').hide();
            }).catch(function(err) {
                // 切换失败，报错 err
            });


            //学生停止推流
            rtc.client.unpublish(rtc.localStream, function(err) {
                console.log(err);
            })
            //结束下课然后断流
            if(rtc.localStream){
                // stop stream
                rtc.localStream.stop();
                // close stream
                rtc.localStream.close();
            }
            rtc.localStream = null;

            _this.delView(_DATA.userinfo.id);

            var msg = '{"msg":[{"_method_":"LinkMic","uid":"'+_DATA.userinfo.id+'","action":"4","avatar":"'+_DATA.userinfo.avatar+'","uname":"'+_DATA.userinfo.user_nickname+'","sex":"0"}],"retcode":"000000","retmsg":"OK"}';
            Socket.emitData('broadcast',msg);
        },
        setWhite:function(action){
            if(action == 1){
                whiteroom.setWritable(true).then(function() {
                    layer.msg('你已被老师授权操作白板');
                    $('#caozuo').show();

                    $('.body_left_bottom_top_c_img_file').hide();
                    whiteroom.setMemberState({
                        currentApplianceName: "pencil",
                        strokeColor: [52, 68, 90],
                        strokeWidth: 4,
                        textSize: 8,
                    });
                    $('.body_left_bottom_top_c_img').eq(1).attr('src','/static/student/images/white/pencil1.png');
                    whiteinfo.strokeWidth=4;
                    whiteinfo.strokeColor=[52, 68, 90];
                    whiteinfo.textSize=15;
                    whiteinfo.currentApplianceName='pencil';

                }).catch(function(err) {
                    // 切换失败，报错 err
                });

            }

            if(action == 5){
                whiteroom.setWritable(false).then(function() {
                    layer.msg('你已被老师取消授权操作白板');
                    $('#caozuo').hide();
                }).catch(function(err) {
                    // 切换失败，报错 err
                });

            }
        }
       
    };

    /**发言的一些操作 */
    var SendMsg={
        body_right_speak_tips_talk:$('.body_right_speak_tips_talk'), 
        body_right_speak_tips_question:$('.body_right_speak_tips_question'), 
        body_right_speak:$('.body_right_speak'),
        body_right_question:$('.body_right_question'),
        send_msg:$('#send_msg'),
        send_question:$('#send_question'),
        init:function(){
            var _this=this;
            _this.body_right_speak_tips_talk.on('click',function(){ //点击切换交流
                var that = $(this);
                that.addClass('msg_active');
                _this.body_right_speak.removeClass('display_none');
                _this.send_msg.removeClass('display_none');

                _this.body_right_speak_tips_question.removeClass('msg_active');
                _this.body_right_question.addClass('display_none');
                _this.send_question.addClass('display_none');
                
            })
            
            _this.body_right_speak_tips_question.on('click',function(){ //点击切换提问
                var that = $(this);
                that.addClass('msg_active');
                _this.body_right_question.removeClass('display_none');
                _this.send_question.removeClass('display_none');

                _this.body_right_speak_tips_talk.removeClass('msg_active');
                _this.body_right_speak.addClass('display_none');
                _this.send_msg.addClass('display_none');
            }) 

            _this.body_right_question.on('click','.body_right_question_li_twen',function(){ //点击同问
                var that = $(this);
                if(that.html()=='已同问'){
                    return ;
                }
                var addtime = that.data('addtime');
                that.html('已同问');
                that.css('color','#B4B4B4')
                var msg = '{"msg":[{"_method_":"ask","addtime":"'+addtime+'","action":2,"msgtype":"2","timestamp":"","equipment":"pc","uid":"'+_DATA.userinfo.id+'","avatar":"'+_DATA.userinfo.avatar+'","user_nickname":"'+_DATA.userinfo.user_nickname+'","user_type":"'+_DATA.roominfo.user_type+'"}],"retcode":"000000","retmsg":"OK"}';
                Socket.emitData('broadcast',msg);
            }) 
        },
    }
$(function(){
    Wind.css('layer');
    Wind.use('layer',function(){
        // if(_DATA.roominfo.user_type==1){
        //     /* 讲师检测设备 */
        //     stratCheck();
        // }
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
            $('.body_left_bottom_top_c_img').eq(0).attr('src','/static/student/images/white/selector.png');
            $('.body_left_bottom_top_c_img').eq(1).attr('src','/static/student/images/white/pencil.png');
            $('.body_left_bottom_top_c_img').eq(2).attr('src','/static/student/images/white/ju.png');
            $('.body_left_bottom_top_c_img').eq(3).attr('src','/static/student/images/white/yuan.png');
            $('.body_left_bottom_top_c_img').eq(4).attr('src','/static/student/images/white/t.png');
            $('.body_left_bottom_top_c_img').eq(5).attr('src','/static/student/images/white/er.png');
            $('.body_left_bottom_top_c_img').eq(6).attr('src','/static/student/images/white/xi.png');
            $('.body_left_bottom_top_c_img').eq(7).attr('src','/static/student/images/white/b.png');
            //$('.body_left_bottom_top_c_img').eq(8).attr('src','/static/student/images/white/del.png');          
        }



        //选择selector
        if(type=='selector'){
            _this.attr('src','/static/student/images/white/selector1.png');
        }

        //选择铅笔
        if(type=='pencil'){
            if(JSON.stringify(whiteinfo.strokeColor) == '[22,156,142]'){
                _this.attr('src','/static/student/images/white/pencil2.png');
            }else if(JSON.stringify(whiteinfo.strokeColor) == '[52,68,90]'){
                _this.attr('src','/static/student/images/white/pencil1.png');
            }else if(JSON.stringify(whiteinfo.strokeColor) == "[246,89,50]"){
                _this.attr('src','/static/student/images/white/pencil3.png');
            }else if(JSON.stringify(whiteinfo.strokeColor) == "[51,161,245]"){
                _this.attr('src','/static/student/images/white/pencil4.png');
            }
        }

        //选择矩形
        if(type=='rectangle'){
            if(JSON.stringify(whiteinfo.strokeColor) == '[22,156,142]'){
                _this.attr('src','/static/student/images/white/ju1.png');
            }else if(JSON.stringify(whiteinfo.strokeColor) == '[52,68,90]'){
                _this.attr('src','/static/student/images/white/ju2.png');
            }else if(JSON.stringify(whiteinfo.strokeColor) == "[246,89,50]"){
                _this.attr('src','/static/student/images/white/ju3.png');
            }else if(JSON.stringify(whiteinfo.strokeColor) == "[51,161,245]"){
                _this.attr('src','/static/student/images/white/ju4.png');
            }
        }
        
        //选择圆形
        if(type=='ellipse'){
            if(JSON.stringify(whiteinfo.strokeColor) == '[22,156,142]'){
                _this.attr('src','/static/student/images/white/yuan1.png');
            }else if(JSON.stringify(whiteinfo.strokeColor) == '[52,68,90]'){
                _this.attr('src','/static/student/images/white/yuan2.png');
            }else if(JSON.stringify(whiteinfo.strokeColor) == "[246,89,50]"){
                _this.attr('src','/static/student/images/white/yuan3.png');
            }else if(JSON.stringify(whiteinfo.strokeColor) == "[51,161,245]"){
                _this.attr('src','/static/student/images/white/yuan4.png');
            }
        }

                
        //选择字
        if(type=='text'){
            if(JSON.stringify(whiteinfo.strokeColor) == '[22,156,142]'){
                _this.attr('src','/static/student/images/white/t1.png');
            }else if(JSON.stringify(whiteinfo.strokeColor) == '[52,68,90]'){
                _this.attr('src','/static/student/images/white/t2.png');
            }else if(JSON.stringify(whiteinfo.strokeColor) == "[246,89,50]"){
                _this.attr('src','/static/student/images/white/t3.png');
            }else if(JSON.stringify(whiteinfo.strokeColor) == "[51,161,245]"){
                _this.attr('src','/static/student/images/white/t4.png');
            }
        }     

        //选择橡皮
        if(type=='eraser'){
            _this.attr('src','/static/student/images/white/er1.png');
        }

        //选择字体颜色
        if(type=='choosecolor'){
            $('.white_fontsize').css('display','none');
            $('.white_choosecolor').css('display','block');

            
            _this.attr('src','/static/student/images/white/xi1.png');
            return ;
        }


        //选择字体粗细
        if(type=='fontsize'){
            $('.white_fontsize').css('display','block');
            $('.white_choosecolor').css('display','none');

            _this.attr('src','/static/student/images/white/b1.png');
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
        $('.body_left_bottom_top_c_img').eq(6).attr('src','/static/student/images/white/xi.png');

        //选择铅笔
        if(whiteinfo.currentApplianceName=='pencil'){
            if(JSON.stringify(whiteinfo.strokeColor) == '[22,156,142]'){
                $('.body_left_bottom_top_c_img').eq(1).attr('src','/static/student/images/white/pencil2.png');
            }else if(JSON.stringify(whiteinfo.strokeColor) == '[52,68,90]'){
                $('.body_left_bottom_top_c_img').eq(1).attr('src','/static/student/images/white/pencil1.png');
            }else if(JSON.stringify(whiteinfo.strokeColor) == "[246,89,50]"){
                $('.body_left_bottom_top_c_img').eq(1).attr('src','/static/student/images/white/pencil3.png');
            }else if(JSON.stringify(whiteinfo.strokeColor) == "[51,161,245]"){
                $('.body_left_bottom_top_c_img').eq(1).attr('src','/static/student/images/white/pencil4.png');
            }
        }

        //选择矩形
        if( whiteinfo.currentApplianceName=='rectangle'){
            if(JSON.stringify(whiteinfo.strokeColor) == '[22,156,142]'){
                $('.body_left_bottom_top_c_img').eq(2).attr('src','/static/student/images/white/ju1.png');
            }else if(JSON.stringify(whiteinfo.strokeColor) == '[52,68,90]'){
                $('.body_left_bottom_top_c_img').eq(2).attr('src','/static/student/images/white/ju2.png');
            }else if(JSON.stringify(whiteinfo.strokeColor) == "[246,89,50]"){
                $('.body_left_bottom_top_c_img').eq(2).attr('src','/static/student/images/white/ju3.png');
            }else if(JSON.stringify(whiteinfo.strokeColor) == "[51,161,245]"){
                $('.body_left_bottom_top_c_img').eq(2).attr('src','/static/student/images/white/ju4.png');
            }
        }
        
        //选择圆形
        if( whiteinfo.currentApplianceName=='ellipse'){
            if(JSON.stringify(whiteinfo.strokeColor) == '[22,156,142]'){
                $('.body_left_bottom_top_c_img').eq(3).attr('src','/static/student/images/white/yuan1.png');
            }else if(JSON.stringify(whiteinfo.strokeColor) == '[52,68,90]'){
                $('.body_left_bottom_top_c_img').eq(3).attr('src','/static/student/images/white/yuan2.png');
            }else if(JSON.stringify(whiteinfo.strokeColor) == "[246,89,50]"){
                $('.body_left_bottom_top_c_img').eq(3).attr('src','/static/student/images/white/yuan3.png');
            }else if(JSON.stringify(whiteinfo.strokeColor) == "[51,161,245]"){
                $('.body_left_bottom_top_c_img').eq(3).attr('src','/static/student/images/white/yuan4.png');
            }
        }

                
        //选择字
        if(whiteinfo.currentApplianceName=='text'){
            if(JSON.stringify(whiteinfo.strokeColor) == '[22,156,142]'){
                $('.body_left_bottom_top_c_img').eq(4).attr('src','/static/student/images/white/t1.png');
            }else if(JSON.stringify(whiteinfo.strokeColor) == '[52,68,90]'){
                $('.body_left_bottom_top_c_img').eq(4).attr('src','/static/student/images/white/t2.png');
            }else if(JSON.stringify(whiteinfo.strokeColor) == "[246,89,50]"){
                $('.body_left_bottom_top_c_img').eq(4).attr('src','/static/student/images/white/t3.png');
            }else if(JSON.stringify(whiteinfo.strokeColor) == "[51,161,245]"){
                $('.body_left_bottom_top_c_img').eq(4).attr('src','/static/student/images/white/t4.png');
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
        $('.body_left_bottom_top_c_img').eq(7).attr('src','/static/student/images/white/b.png');

        whiteroom.setMemberState({
            currentApplianceName: whiteinfo.currentApplianceName,
            strokeColor:  whiteinfo.strokeColor,
            strokeWidth: whiteinfo.strokeWidth,
            textSize: whiteinfo.textSize,
        });
    })


    //全体禁言
    $('#stopspeak').click(function(){

        var ischecked=$(this).is(':checked');
        var isshup='';
        if(ischecked==true){ //表示要进行禁言
            if(_DATA.roominfo.isshup==1){
                layer.msg('禁言中，请不要重复禁言');
                $(":checkbox[id='stopspeak']").prop("checked",true);
                return ;
            }

            isshup=1;
        }else{ //要进行取消禁言
            if(_DATA.roominfo.isshup==0){
                layer.msg('非禁言，请不要重复非禁言');
                $(":checkbox[id='stopspeak']").prop("checked",false);
                return ;
            }

            isshup=0;
        }

        $.ajax({
            type: "POST",
            url:'/student/liveing/roomShutup',
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
                        $(":checkbox[id='stopspeak']").prop("checked",false);
                    }else{
                        $(":checkbox[id='stopspeak']").prop("checked",true);
                    }
                    
                    handelRes(data);
                    return !1;
                }
                layer.msg(data.msg);

                _DATA.roominfo.isshup=isshup;

                if(isshup==1){
                    var msg='已开启禁言';
                }else{
                    var msg='已关闭禁言';
                }
                
                var msg = '{"msg":[{"_method_":"roomShutup","action":"'+isshup+'","uid":"'+_DATA.userinfo.id+'","avatar":"'+_DATA.userinfo.avatar+'","user_nickname":"'+_DATA.userinfo.user_nickname+'"}],"retcode":"000000","retmsg":"OK"}';
                
                Socket.emitData('broadcast',msg);	
            }
        })
    })

    //点击发言
    $('#send_msg .body_right_send_button').click(function(){
        var value=$('#send_msg .body_right_send_msg').val();
        if(_DATA.roominfo.isshup == 1){
            layer.msg('全体禁言中');
            return ;
        }
        if(value==''){
            layer.msg('请输入要发言的内容');
            return ;
        }

        if(!$.trim(value)){
            layer.msg('不能只发送空格');
            return ;
        }


        //判断有没有被禁言
        $.ajax({ 
            type: 'post', 
            url: '/student/liveing/isUserShutup', //
            dataType:'json',
            data:{courseid:courseid,lessonid:lessonid,liveuid:_DATA.teacherinfo.id},
            success:function(data){
                if(data.code==0){
                    handelRes(data);
                    return !1;
                }
                
                if(data.data==1){
                    layer.msg(data.msg);
                    return !1;
                }else{
                    $('#send_msg .body_right_send_msg').val('');

                    var msg = '{"msg":[{"_method_":"SendMsg","action":1,"content":"'+value+'","uid":"'+_DATA.userinfo.id+'","avatar":"'+_DATA.userinfo.avatar+'","user_nickname":"'+_DATA.userinfo.user_nickname+'","user_type":"'+_DATA.roominfo.user_type+'"}],"retcode":"000000","retmsg":"OK"}';
                    Socket.emitData('broadcast',msg);	
                }
            },
            error:function(e){

            }
        })



    })

    //点击提问
    $('#send_question .body_right_send_button').click(function(){
        var value=$('#send_question .body_right_send_msg').val();
        if(_DATA.roominfo.isshup == 1){
            layer.msg('全体禁言中');
            return ;
        }
        if(value==''){
            layer.msg('请输入要发言的内容');
            return ;
        }

        if(!$.trim(value)){
            layer.msg('不能只发送空格');
            return ;
        }


        //判断有没有被禁言
        $.ajax({ 
            type: 'post', 
            url: '/student/liveing/isUserShutup', //
            dataType:'json',
            data:{courseid:courseid,lessonid:lessonid,liveuid:_DATA.teacherinfo.id},
            success:function(data){
                if(data.code==0){
                    handelRes(data);
                    return !1;
                }
                
                if(data.data==1){
                    layer.msg(data.msg);
                    return !1;
                }else{
                    $('#send_question .body_right_send_msg').val('');


                    var addtime = _DATA.userinfo.id+'_'+Date.parse(new Date());
                    var msg = '{"msg":[{"_method_":"ask","addtime":"'+addtime+'","action":1,"msgtype":"2","timestamp":"","equipment":"pc","content":"'+value+'","uid":"'+_DATA.userinfo.id+'","avatar":"'+_DATA.userinfo.avatar+'","user_nickname":"'+_DATA.userinfo.user_nickname+'","user_type":"'+_DATA.roominfo.user_type+'"}],"retcode":"000000","retmsg":"OK"}';
                    Socket.emitData('broadcast',msg);	
                }
            },
            error:function(e){

            }
        })



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
                url:'/student/liveing/upfileuuid',
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
    classInterval:function(data){
        clearInterval(classIntavl);
        //展示上课时间
        $('.body_left_top_status').html('');
        var html='已上课 <span id="h">'+data.info.arr.h+'</span>:<span id="m">'+data.info.arr.m+'</span>:<span id="s">'+data.info.arr.s+'</span>';
        $('.body_left_top_status').html(html);

        classIntavl=setInterval(function(){
            var oldh=$('#h').text();
            var oldm=$('#m').text();
            var olds=$('#s').text();
            var newh=oldh;
            var newm=oldm;
            var news=olds;
            if(parseInt(olds)==59){
                news='00';
                newm=parseInt(oldm)+1;

                if(newm==60){
                    newm='00';
                    newh=parseInt(oldh)+1;
                }
            }

            if(parseInt(olds)<59){
                news=parseInt(olds)+1;
            }

            $('#h').text(newh);
            $('#m').text(newm);
            $('#s').text(news);
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
                    console.log();
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
        url: '/student/liveing/addPhoto', //上传文件的请求路径必须是绝对路劲
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
        url: '/student/liveing/addFiles', //上传文件的请求路径必须是绝对路劲
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
                    url:'/student/liveing/upfileuuid',
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
                <a href="javascript:void(0)"><img class="whiteboard_page_white" onclick="backWhitePpt()" src="/static/student/images/white/white.png"></a>\
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
                <a href="javascript:void(0)"><img class="whiteboard_page_left" onclick="pageTop()" src="/static/student/images/white/left.png"></a>\
                <a href="javascript:void(0)" class="whiteboard_preview" onclick="pptpreview(1)" ><img  src="/static/student/images/white/ppt_preview.png">\
                <span class="whiteboard_page_1">'+page+'</span>\
                <span class="whiteboard_page_2">/</span>\
                <span class="whiteboard_page_3">'+maxpages+'</span></a>\
                <a href="javascript:void(0)"><img class="whiteboard_page_right" onclick="pageNext()" src="/static/student/images/white/right.png"></a>\
                <a href="javascript:void(0)"><img class="whiteboard_page_white" onclick="backWhite()" src="/static/student/images/white/white.png"></a>\
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
















