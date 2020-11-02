
//进入白板房间
function joinWhite(isTwo){
    //这是进入白板房间
    var uuid=_DATA.roominfo.uuid;
    var roomToken=_DATA.roominfo.roomtoken;
    var appid=_DATA.roominfo.netless_appid;

    var whiteWebSdk = new WhiteWebSdk({
        appIdentifier: appid, // 从管理控制台获取 App Identifier
    });

    var replayRoomParams = {
        room: uuid,
        roomToken: roomToken
    };
    whiteWebSdk.replayRoom(replayRoomParams).then(function (player) {
        // 获取到回放数据，成功初始化播放器实例
    
        roomPlayer = player;
        roomPlayer.bindHtmlElement(document.getElementById("whiteboard"));

        if(isTwo == true){
            xg_player.on('play',function(){
                roomPlayer.play();
            })
            xg_player.on('playing',function(){
                roomPlayer.play();
            })
            xg_player.on('pause',function(){
                roomPlayer.pause();
            })
    
            xg_player.on('ended',function(){
                roomPlayer.stop();
                joinWhite(true);
            })
        }else{
            var data_play={
                id:'play',
                autoplay: true,
                poster: _DATA.roominfo.thumb,
                autoplayMuted: false,
                ignores: [],
                controls:false,
                loop:false
            };
    
            xg_play('paly',_DATA.roominfo.url,data_play);
    
            xg_player.on('play',function(){
                roomPlayer.play();
            })
            xg_player.on('playing',function(){
                roomPlayer.play();
            })
            xg_player.on('pause',function(){
                roomPlayer.pause();
            })
    
            xg_player.on('ended',function(){
                roomPlayer.pause();
                joinWhite(true);
            })
        }


        


    }).catch(function(err) {
        // 获取回放数据失败
        console.error(err);
    });

}

$(function(){
    joinWhite(false);
})




















