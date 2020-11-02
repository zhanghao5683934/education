var JsInterface={
	chatFromSocket: function(data) {
		var data =JSON.parse(data) ;//WlTools.strTojson(data);
		var msgObject = data.msg[0];
		var msgaction = msgObject.action;
		var msgmethod = msgObject._method_;
		if(msgmethod=='SendMsg'){ //聊天信息
			this.sendMsg(msgObject);
		}else if(msgmethod=='SystemNot'){ //系统信息
			this.systemNot(msgObject);
		}else if(msgmethod=='Kick'){ //踢人
			this.Kick(msgObject);
		}else if(msgmethod=='Shutup'){ //禁言等操作
			this.Shutup(msgObject);
		}else if(msgmethod=='LinkMic'){ //连麦
			this.LinkMic(msgObject);
		}else if(msgmethod=='ShareScreen'){ //老师共享屏幕
			this.ShareScreen(msgObject);
		}else if(msgmethod=='roomShutup'){ //禁言
			this.roomShutup(msgObject);
		}else if(msgmethod=='robans'){  //抢答
			this.robans(msgObject);
		}else if(msgmethod=='setWhite'){ //给学生授权白板
			this.setWhite(msgObject);
		}else if(msgmethod=='ask'){ //提问
			this.Ask(msgObject);
		}else if(msgmethod=='roomChat'){ //交流区是否开放
			this.roomChat(msgObject);
		}else if(msgmethod=='exam'){ //随堂测验
			this.Exam(msgObject);
		}else if(msgmethod=='practice'){ //课堂练习
			this.Practice(msgObject);
		}else if(msgmethod=='rob'){ //抢答
			this.Rob(msgObject);
		}else if(msgmethod=='know'){ //懂不懂
			this.Know(msgObject);
		}else if(msgmethod=='praise'){ //表扬
			this.Praise(msgObject);
		}else if(msgmethod=='setLiveModel'){ //关闭视频音频等问题
			this.setLiveModel(msgObject);
		}
	},
	setLiveModel(data){
		var action = data.action;
		var touid = data.touid;
 
		if(action==1){ //1关闭麦克风 2开启没课风 3关闭摄像头 4 开启摄像头

			if(touid==_DATA.userinfo.id){
				rtc.localStream.muteAudio();
			}
		}else if(action==2){
			if(touid==_DATA.userinfo.id){
				rtc.localStream.unmuteAudio();
			}
		}else if(action==3){
			if(touid==_DATA.userinfo.id){
				rtc.localStream.muteVideo();
			}
			$('#player_'+touid).parents('.list_li').find('.list_li_bg').addClass('on');

			if(touid==_DATA.teacherinfo.id){
				$('.body_right_video_bg').addClass('on');
			}
		}else if(action==4){
			if(touid==_DATA.userinfo.id){
				rtc.localStream.unmuteVideo();
			}
			$('#player_'+touid).parents('.list_li').find('.list_li_bg').removeClass('on');
			if(touid==_DATA.teacherinfo.id){
				$('.body_right_video_bg').removeClass('on');
			}
		}


	},
	Praise(data){
		Praise.startPraise(data);
	},
	Rob(data){
		if(data.action==1){ //发布了抢答
			Robans.startRob();
		}else if(data.action==0){ //结束抢答
			Robans.endRob();
		}else if(data.action==3){ //有学生抢到了
			Robans.haveRob(data);
		}

	},
	Know(data){
		if(data.action==1){ //发布了懂不懂
			Know.startKnow();
		}else if(data.action==0){ //结束懂不懂
			Know.endKnow();
		}

	},
	Practice(data){
		if(data.action == 1){ //发布了课堂练习
			Exam.getPractice(data);
		}else if(data.action == 0){ //结束了课堂练习
			Exam.endPractice();
		}else if(data.action == 2){ //练习时间结束
			Exam.practiceSubmit(2);
		}
	},
	Exam(data){
		if(data.action == 1){ //发布了随堂测试
			Exam.getExam(data);
		}else if(data.action == 0){ //结束了测试
			Exam.endExam();
		}
	},
	setWhite(data){
		var msgaction = data.action;
		if(msgaction == 1 && _DATA.userinfo.id == data.touid){ //授权操作白板
			Linkmic.setWhite(1);
		}

		if(msgaction == 5 && _DATA.userinfo.id == data.touid){ //取消授权操作白板
			Linkmic.setWhite(5);
		}

	},
	robans(data){ //老师发布抢答

		if(_DATA.userinfo.id != _DATA.teacherinfo.id){

			var html = '<div class="exam_list_ul" id="robans_ul">\
							<div class="exam_list_ul_type">选择题</div>\
							<div class="exam_list_ul_li">\
								<div class="exam_list_ul_li_name">1. '+data.name+'</div>\
								<a href="javascript:void(0)" class="exam_list_ul_li_answer" data-id="'+data.examid+'" data-name="0">A '+data['answer'][0].name+'</a>\
								<a href="javascript:void(0)" class="exam_list_ul_li_answer" data-id="'+data.examid+'" data-name="1">B '+data['answer'][1].name+'</a>\
								<a href="javascript:void(0)" class="exam_list_ul_li_answer" data-id="'+data.examid+'" data-name="2">C '+data['answer'][2].name+'</a>\
								<a href="javascript:void(0)" class="exam_list_ul_li_answer" data-id="'+data.examid+'" data-name="3">D '+data['answer'][3].name+'</a>\
							</div>\
							<div class="robans_ul_bottom">\
								<button class="robans_ul_bottom_no">放弃</button><button data-id="'+data.examid+'" class="robans_ul_bottom_yes">抢答</button>\
								<div class="robans_ul_bottom_tips hide">正确答案：C</div>\
							</div>\
						</div>';

			$('#js_robans_stu').show();
			$('#js_robans_stu').find('.exam_list_bd').html('');
			$('#js_robans_stu').find('.exam_list_bd').html(html);
		}

	},
	ShareScreen:function(data){
		var action=data.action;

		if(action==0){ //老师开始共享屏幕
			
		}

		if(action==1){ //老师结束共享屏幕
        
		}	
	},
	LinkMic:function(data)
	{
        var msgtype = data.msgtype;
		var msgaction = data.action;
		var _method_ = data._method_;
        
        if(msgaction==1){
            /* 学生举手 */
            Student.addHand();
		}

		if(msgaction==2 && _DATA.userinfo.id == data.touid){  
            /* 老师同意上麦 */
			//学生开始推流
			Linkmic.startPush();
		}

		if(msgaction==3 && _DATA.userinfo.id == data.touid){  
            /* 老师拒绝上麦 */
			Linkmic.noLink();
		}

		
		if(msgaction==5 && _DATA.userinfo.id == data.touid){  
            /* 老师让学生下麦 */
			Linkmic.downLink();
		}

		
		if(msgaction==6 && _DATA.userinfo.id == data.touid){  
            /* 老师同意上麦 */
			//学生开始推流
			Linkmic.startPush();
		}
		

	},
	Kick:function(data)
	{
		if(data.touid==_DATA.userinfo.id){
			layer.msg('你已被踢出直播间');
			setTimeout(function(){
				location.href="/student"
			},1500)
		}
		
	},
	Shutup:function(data){
		if(data.touid==_DATA.userinfo.id){
			
		}
	},
	roomChat:function(data){
		_DATA.roominfo.chatopen=data.action;
	},
	getBrowser:function() {
		var ua = window.navigator.userAgent;
		var isIE = window.ActiveXObject != undefined && ua.indexOf("MSIE") != -1;
		var isFirefox = ua.indexOf("Firefox") != -1;
		var isOpera = window.opr != undefined;
		var isChrome = ua.indexOf("Chrome") && window.chrome;
		var isSafari = (ua.indexOf("Safari") != -1 && ua.indexOf("Version") != -1) || ua.indexOf('iPhone') != -1;
		if (isIE) {
			return "IE";
		} else if (isFirefox) {
			return "Firefox";
		} else if (isOpera) {
			return "Opera";
		} else if (isChrome) {
			return "Chrome";
		} else if (isSafari) {
			return "Safari";
		} else {
			return "Unkown";
		}
	},
	sendMsg:function(data){
        var msgtype = data.msgtype;
		var msgaction = data.action;
		var _method_ = data._method_;
        if(msgaction==0){
			this.enterRoom(data);
		}else if(msgaction==1){
            this.sendChat(data);
		}
	},
	Ask:function(data){
		if(data.action == 1){ //提问

			var text = ''
			if(data.uid!=_DATA.userinfo.id){
				text = '<div class="body_right_question_li_twen" data-addtime="'+data.addtime+'">同问+1</div>';
			}
			html='<div class="body_right_question_li">\
					<div class="body_right_question_li_text1">提问者：'+data.user_nickname+'</div>\
					<div class="body_right_question_li_text2">'+data.content+'</div>'+text+'</div>';

			$('.body_right_question').append(html);

			var scrollHeight = $('.body_right_question').prop("scrollHeight");
			$('.body_right_question').scrollTop(scrollHeight,200);
		}
	},
	sendChat:function(data){
        var html='';
        var teach='';
        var msg_content=data.content;
        msg_content=emojiToImg(msg_content);
        if(data.uid==_DATA.userinfo.id){ //是自己发的
            if(data.user_type==1){ //是老师发的
                teach+='<div class="body_right_speak_li_message_teacher">讲师</div>';
            }
            if(data.user_type==2){ //是老师发的
                teach+='<div class="body_right_speak_li_message_teacher">辅导</div>';
            }
            html+='<div class="body_right_speak_li">\
                        <div class="body_right_speak_li_message">\
                            <img class="body_right_speak_li_message_img" src="'+data.avatar+'">\
                            <div class="body_right_speak_li_message_name">'+data.user_nickname+'</div>'+teach+'</div>\
                        <div class="body_right_speak_li_msg">\
                            <div class="body_right_speak_li_msg_san"></div>\
                            <div class="body_right_speak_li_msg_div_text">\
                                <div class="body_right_speak_li_msg_text">'+msg_content+'</div>\
                            </div>\
                        </div>\
                    </div>';
        }else{

			if(_DATA.roominfo.chatopen == 0 && data.user_type == 0){
				return ;
			}
            if(data.user_type==1){ //是老师发的
                teach+='<div class="body_right_speak_li_message_teacher_other">讲师</div>';
            }
            
            if(data.user_type==2){ //是老师发的
                teach+='<div class="body_right_speak_li_message_teacher_other">辅导</div>';
			}

			if(data.user_type!=0){
				html+='<div class="body_right_speak_li">\
							<div class="body_right_speak_li_message">\
								<img class="body_right_speak_li_message_img_other" src="'+data.avatar+'">\
								<div class="body_right_speak_li_message_name_other">'+data.user_nickname+'</div>'+teach+'</div>\
							</div>\
							<div class="body_right_speak_li_msg">\
								<div class="body_right_speak_li_msg_div_text_other" style="left:52px">\
									<div class="body_right_speak_li_msg_text_other_teacher">'+msg_content+'</div>\
								</div>\
							</div>\
						</div>';
			}else{
				html+='<div class="body_right_speak_li">\
							<div class="body_right_speak_li_message">\
								<img class="body_right_speak_li_message_img_other" src="'+data.avatar+'">\
								<div class="body_right_speak_li_message_name_other">'+data.user_nickname+'</div>'+teach+'</div>\
							<div class="body_right_speak_li_msg">\
								<div class="body_right_speak_li_msg_san_other"></div>\
								<div class="body_right_speak_li_msg_div_text_other">\
									<div class="body_right_speak_li_msg_text_other">'+msg_content+'</div>\
								</div>\
							</div>\
						</div>';
			}

        }
        $('.body_right_speak').append(html);

        var scrollHeight = $('.body_right_speak').prop("scrollHeight");
        $('.body_right_speak').scrollTop(scrollHeight,200);
    },
	enterRoom:function(data){
        var html='<div class="body_right_speak_tips_talk_welcome">欢迎<span style="color:#38DAA6;">'+data.ct.user_nickname+'</span>进入课堂</div>';

        $('.body_right_speak').append(html);

        //滑动到底部显示最新的发言
        var scrollHeight = $('.body_right_speak').prop("scrollHeight");
        $('.body_right_speak').scrollTop(scrollHeight,200);


	},
	disconnect:function(data){
		var oldnum=$('.livenums').html();
		
		var newnum=parseInt(oldnum)-1;
		$('.livenums').html(newnum);
	},
	systemNot:function(data){

		// //判断是否是手机
		// var mobile_flag = this.isMobile();
		// if(mobile_flag){
				
		// }else{
			var html='';
			if(data.action==1){ //聊天服务器连接提示
				html+='<div class="body_right_speak_msg_tips">'+data.ct+'</div>';
			}
	
			if(data.action==0){ //学生进入房间提示
				html+='<div class="body_right_speak_msg_tips">'+data.ct.user_nicename+'进入房间</div>';
			}
	
			$('.body_right_speak').append(html);

			var scrollHeight = $('.body_right_speak').prop("scrollHeight");
			$('.body_right_speak').scrollTop(scrollHeight,200);
		//}
	},
	isMobile:function() {
		var userAgentInfo = navigator.userAgent;

		var mobileAgents = [ "Android", "iPhone", "SymbianOS", "Windows Phone", "iPad","iPod"];

		var mobile_flag = false;

		//根据userAgent判断是否是手机
		for (var v = 0; v < mobileAgents.length; v++) {
			if (userAgentInfo.indexOf(mobileAgents[v]) > 0) {
				mobile_flag = true;
				break;
			}
		}
		var screen_width = window.screen.width;
		var screen_height = window.screen.height;   

		//根据屏幕分辨率判断是否是手机
		if(screen_width < 500 && screen_height < 800){
			mobile_flag = true;
		}

		return mobile_flag;
	},
    roomShutup:function(data){
		var action = data.action;
		var _method_ = data._method_;
        
        _DATA.roominfo.isshup=action;
        
		if(action==0){
            $(":checkbox[id='stopspeak']").prop("checked",false);
		}
        
        if(action==1){
            $(":checkbox[id='stopspeak']").prop("checked",true);
		}


	},
}