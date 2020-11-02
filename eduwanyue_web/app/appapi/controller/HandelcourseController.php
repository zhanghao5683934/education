<?php

/* 处理直播中课程 */
namespace app\appapi\controller;

use cmf\controller\HomeBaseController;
use think\Db;

class HandelcourseController extends HomebaseController{

	public function upCourseLive(){
        $notime=time();
        
        Db::name("course")->where([['sort','>=',2],['islive','=',0],['starttime','<=',$notime]])->update(['islive'=>1]);
        
        $where=[];
        $where[]=['sort','>=','2'];
        $where[]=['islive','=','1'];
        $where[]=['endtime','<',$notime];
        
        $list=Db::name("course")->where($where)->select();
        $list->each(function($v,$k){
            $islive=hGet('liveing',$v['uid']);
            $stream=$v['uid'].'_'.$v['id'].'_0';
            if(!$islive || $stream!=$islive){
                releaseTask($v['uid'],$v['id']);
                Db::name("course")->where(['id'=>$v['id']])->update(['islive'=>2,'endtime'=>time()]);
            }
            
        });
        // file_put_contents(CMF_ROOT.'data/uplive_'.date('Y-m-d').'.txt',date('Y-m-d H:i:s').' 提交参数信息 :'.'OK'."\r\n",FILE_APPEND);
        echo 'OK';
        exit;
    }
    
    
    public function upLessonLive(){
        $notime=time();
        
        Db::name("course_lesson")->where([['type','>=',4],['islive','=',0],['starttime','<=',$notime]])->update(['islive'=>1]);
        
        $where=[];
        $where[]=['type','>=','4'];
        $where[]=['islive','=','1'];
        $where[]=['endtime','<',$notime];
        
        $list=Db::name("course_lesson")->where($where)->select();
        $list->each(function($v,$k){
            $islive=hGet('liveing',$v['uid']);
            $stream=$v['uid'].'_'.$v['courseid'].'_'.$v['id'];
            
            if(!$islive || $stream!=$islive){
                $update=['islive'=>2,'endtime'=>time()];
                if($v['resourceid'] && $v['sid']){
                    $rs_stop=agoraStopRe($stream,$v['uid'],$v['resourceid'],$v['sid']);
                    if($rs_stop['code']==0){
                        // $url=$rs_stop['data']['serverResponse']['fileList'][0]['filename'];
                    }
                    
                    $url="record/{$v['sid']}_{$stream}.m3u8";
                    
                    $update['url']=$url;
                }
            
                Db::name("course_lesson")->where(['id'=>$v['id']])->update($update);
                releaseTask($v['uid'],$v['courseid'],$v['id']);
            }
            
        });
        // file_put_contents(CMF_ROOT.'data/uplive_'.date('Y-m-d').'.txt',date('Y-m-d H:i:s').' 提交参数信息 :'.'OK'."\r\n",FILE_APPEND);
        echo 'OK';
        exit;
    }
    
    /* 新课程提醒 */
    public function sendCourse(){
        
        $notime=time();
        
        $list=Db::name("course")->where([['ispush','=',0],['shelvestime','<=',$notime]])->select()->toArray();
        foreach($list as $k=>$v){
            Db::name("course")->where([ ['id','=',$v['id']] ])->update(['ispush'=>1]);
            
            $uid=$v['uid'];
            
            $touid=Db::name("users_attention")->where([ ['touid','=',$uid] ])->select()->toArray();
            if($touid){
                $touids=array_column($touid,'uid');
                $touids=array_filter($touids);
                
                if($touids){
                    $userinfo=getUserInfo($uid);
                    $title='你关注的讲师'.$userinfo['user_nickname'].'发布了新的课程～';
                    
                    sendMessage(2,$touids,$title);
                }
            }
        }
        
        echo 'OK';
        exit;
    }
    /* 课时提醒 */
	

}