<?php

// +----------------------------------------------------------------------
// | Created by Wanyue
// +----------------------------------------------------------------------
// | Copyright (c) 2017~2019 http://www.sdwanyue.com All rights reserved.
// +----------------------------------------------------------------------
// | Author: https://gitee.com/WanYueKeJi
// +----------------------------------------------------------------------
// | Date: 2020/09/05 10:35
// +----------------------------------------------------------------------
namespace App\Domain;

use App\Model\Addr as Model_Addr;

class Addr {

    /* 列表 */
	public function getList($where=[]) {


        $model = new Model_Addr();
        $list= $model->getList($where);

		return $list;
	}

    /**
     * 某个信息
     * @param array $where
     * @return mixed
     */
	public function getInfo($where=[]) {


        $model = new Model_Addr();
        $info= $model->getInfo($where);

		return $info;
	}

    /**
     * 新增
     * @param $data
     * @return array
     */
	public function setAddr($data) {
        
        $rs = array('code' => 0, 'msg' => \PhalApi\T('新增成功'), 'info' => array());

        $model = new Model_Addr();
        $res= $model->setAddr($data);
        if($res===false){
            $rs['code'] = 1002;
			$rs['msg'] = \PhalApi\T('新增失败，请重试');
			return $rs;
        }
        
        $where2=[
            'uid'=>$data['uid'],
            'id!=?'=>$res['id'],
        ];
        $model->upAddr($where2,['isdef'=>0]);

		return $rs;
	}

    /**
     * 编辑
     * @param $data
     * @return array
     */
	public function upAddr($data) {
        
        $rs = array('code' => 0, 'msg' => \PhalApi\T('编辑成功'), 'info' => array());
        
        $addrid=$data['addrid'];
        $uid=$data['uid'];
        unset($data['addrid']);
        unset($data['uid']);
        
        $model = new Model_Addr();
        
        $where=[
            'id'=>$addrid,
        ];
        
        $info= $model->getInfo($where);
        
        if(!$info){
            $rs['code'] = 1002;
			$rs['msg'] = \PhalApi\T('信息错误');
			return $rs;
        }
        
        if($info['uid']!=$uid){
            $rs['code'] = 1003;
			$rs['msg'] = \PhalApi\T('信息错误');
			return $rs;
        }
        
        $res= $model->upAddr($where,$data);
        if($res===false){
            $rs['code'] = 1004;
			$rs['msg'] = \PhalApi\T('编辑失败，请重试');
			return $rs;
        }

		return $rs;
	}

    /* 设置默认 */
	public function setDefault($data) {
        
        $rs = array('code' => 0, 'msg' => \PhalApi\T('设置成功'), 'info' => array());
        
        $addrid=$data['addrid'];
        $uid=$data['uid'];
        unset($data['addrid']);
        unset($data['uid']);
        
        $model = new Model_Addr();
        
        $where=[
            'id'=>$addrid,
        ];
        
        $info= $model->getInfo($where);
        
        if(!$info){
            $rs['code'] = 1002;
			$rs['msg'] = \PhalApi\T('信息错误');
			return $rs;
        }
        
        if($info['uid']!=$uid){
            $rs['code'] = 1003;
			$rs['msg'] = \PhalApi\T('信息错误');
			return $rs;
        }
        
        $data2=['isdef'=>1];
        $data3=['isdef'=>0];
        $where3=['uid'=>$uid];
        $where2=['id'=>$addrid];
        
        $res3= $model->upAddr($where3,$data3);
        
        $res2= $model->upAddr($where2,$data2);
        

		return $rs;
	}

    /* 删除 */
	public function delAddr($data) {
        
        $rs = array('code' => 0, 'msg' => \PhalApi\T('删除成功'), 'info' => array());
        
        $addrid=$data['addrid'];
        $uid=$data['uid'];
        unset($data['addrid']);
        unset($data['uid']);
        
        $model = new Model_Addr();
        
        $where=[
            'id'=>$addrid,
        ];
        
        $info= $model->getInfo($where);
        
        if(!$info){
            $rs['code'] = 1002;
			$rs['msg'] = \PhalApi\T('信息错误');
			return $rs;
        }
        
        if($info['uid']!=$uid){
            $rs['code'] = 1003;
			$rs['msg'] = \PhalApi\T('信息错误');
			return $rs;
        }
        
        $where2=['id'=>$addrid];
        
        $res3= $model->delAddr($where2);
        
        if($info['isdef']==1){
            $where=[
                'uid'=>$uid,
            ];
            $list=$model->getList($where);
            if($list){
                $id=$list[0]['id'];
                $where3=[
                    'id'=>$id,
                ];
                $model->upAddr($where3,['isdef'=>'1']);
            }
        }
        

		return $rs;
	}
	
	
}
