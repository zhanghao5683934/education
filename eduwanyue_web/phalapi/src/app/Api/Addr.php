<?php

// +----------------------------------------------------------------------
// | Created by Wanyue
// +----------------------------------------------------------------------
// | Copyright (c) 2017~2019 http://www.sdwanyue.com All rights reserved.
// +----------------------------------------------------------------------
// | Author: https://gitee.com/WanYueKeJi
// +----------------------------------------------------------------------
// | Date: 2020/09/01 09:22
// +----------------------------------------------------------------------

namespace App\Api;

use PhalApi\Api;
use App\Domain\Addr as Domain_Addr;

/**
 * 地址
 */
class Addr extends Api {

	public function getRules() {
        return array(
            'setAddr' => array(
                'name' => array('name' => 'name', 'type' => 'string', 'desc' => '收货人'),
                'mobile' => array('name' => 'mobile', 'type' => 'string', 'desc' => '电话'),
                'province' => array('name' => 'province', 'type' => 'string', 'desc' => '省'),
                'city' => array('name' => 'city', 'type' => 'string', 'desc' => '市'),
                'area' => array('name' => 'area', 'type' => 'string', 'desc' => '区'),
                'addr' => array('name' => 'addr', 'type' => 'string', 'desc' => '详细地址'),
            ),
            
            'upAddr' => array(
                'addrid' => array('name' => 'addrid', 'type' => 'int', 'desc' => '地址ID'),
                'name' => array('name' => 'name', 'type' => 'string', 'desc' => '收货人'),
                'mobile' => array('name' => 'mobile', 'type' => 'string', 'desc' => '电话'),
                'province' => array('name' => 'province', 'type' => 'string', 'desc' => '省'),
                'city' => array('name' => 'city', 'type' => 'string', 'desc' => '市'),
                'area' => array('name' => 'area', 'type' => 'string', 'desc' => '区'),
                'addr' => array('name' => 'addr', 'type' => 'string', 'desc' => '详细地址'),
            ),
            
            'setDefault' => array(
                'addrid' => array('name' => 'addrid', 'type' => 'int', 'desc' => '地址ID'),
            ),
            
            'delAddr' => array(
                'addrid' => array('name' => 'addrid', 'type' => 'int', 'desc' => '地址ID'),
            ),
        );
	}
    /**
     * 地址列表
     * @desc 用于获取地址列表
     * @return int code 操作码，0表示成功
     * @return array info 
     * @return string info[].id  
     * @return string info[].name 收货人 
     * @return string info[].mobile 电话
     * @return string info[].province 省
     * @return string info[].city 市
     * @return string info[].area 区
     * @return string info[].addr 详细地址
     * @return string info[].isdef 是否默认地址，0否1是
     * @return string msg 提示信息
     */
	public function getList() {
        $rs = array('code' => 0, 'msg' => '', 'info' => array());

        $uid = \App\checkNull($this->uid);
        $token = \App\checkNull($this->token);
        
        $checkToken=\App\checkToken($uid,$token);
		if($checkToken==700){
			$rs['code'] = $checkToken;
			$rs['msg'] = \PhalApi\T('您的登陆状态失效，请重新登陆！');
			return $rs;
		}
        
        
        $where=[
            'uid'=>$uid
        ];

        $domain = new Domain_Addr();
		$list = $domain->getList($where);
        
        $rs['info']=$list;
		
        return $rs;
	}

    /**
     * 新增地址
     * @desc 用于新增地址
     * @return int code 操作码，0表示成功
     * @return array info 
     * @return string msg 提示信息
     */
	public function setAddr() {
        $rs = array('code' => 0, 'msg' => '', 'info' => array());

        $uid = \App\checkNull($this->uid);
        $token = \App\checkNull($this->token);
        
        $checkToken=\App\checkToken($uid,$token);
		if($checkToken==700){
			$rs['code'] = $checkToken;
			$rs['msg'] = \PhalApi\T('您的登陆状态失效，请重新登陆！');
			return $rs;
		}
        
        $name = \App\checkNull($this->name);
        $mobile = \App\checkNull($this->mobile);
        $province = \App\checkNull($this->province);
        $city = \App\checkNull($this->city);
        $area = \App\checkNull($this->area);
        $addr = \App\checkNull($this->addr);
        
        if($name =='' || $mobile=='' || $province=='' || $city=='' || $area=='' || $addr==''){
            $rs['code'] = 1001;
			$rs['msg'] = \PhalApi\T('信息错误');
			return $rs;
        }
        
        
        $data=[
            'uid'=>$uid,
            'name'=>$name,
            'mobile'=>$mobile,
            'province'=>$province,
            'city'=>$city,
            'area'=>$area,
            'addr'=>$addr,
            'isdef'=>1,
            'addtime'=>time(),
        ];

        $domain = new Domain_Addr();
		$res = $domain->setAddr($data);
		
        return $res;
	}

    /**
     * 编辑地址
     * @desc 用于编辑地址
     * @return int code 操作码，0表示成功
     * @return array info 
     * @return string msg 提示信息
     */
	public function upAddr() {
        $rs = array('code' => 0, 'msg' => '', 'info' => array());

        $uid = \App\checkNull($this->uid);
        $token = \App\checkNull($this->token);
        
        $checkToken=\App\checkToken($uid,$token);
		if($checkToken==700){
			$rs['code'] = $checkToken;
			$rs['msg'] = \PhalApi\T('您的登陆状态失效，请重新登陆！');
			return $rs;
		}
        
        $addrid = \App\checkNull($this->addrid);
        $name = \App\checkNull($this->name);
        $mobile = \App\checkNull($this->mobile);
        $province = \App\checkNull($this->province);
        $city = \App\checkNull($this->city);
        $area = \App\checkNull($this->area);
        $addr = \App\checkNull($this->addr);
        
        if($addrid <0 || $name =='' || $mobile=='' || $province=='' || $city=='' || $area=='' || $addr==''){
            $rs['code'] = 1001;
			$rs['msg'] = \PhalApi\T('信息错误');
			return $rs;
        }
        
        
        $data=[
            'addrid'=>$addrid,
            'uid'=>$uid,
            'name'=>$name,
            'mobile'=>$mobile,
            'province'=>$province,
            'city'=>$city,
            'area'=>$area,
            'addr'=>$addr,
            'addtime'=>time(),
        ];

        $domain = new Domain_Addr();
		$res = $domain->upAddr($data);
		
        return $res;
	}

    /**
     * 获取默认地址
     * @desc 用于获取默认地址
     * @return int code 操作码，0表示成功
     * @return array info  空数组未添加地址
     * @return string msg 提示信息
     */
	public function getDefault() {
        $rs = array('code' => 0, 'msg' => '', 'info' => array());

        $uid = \App\checkNull($this->uid);
        $token = \App\checkNull($this->token);
        
        $checkToken=\App\checkToken($uid,$token);
		if($checkToken==700){
			$rs['code'] = $checkToken;
			$rs['msg'] = \PhalApi\T('您的登陆状态失效，请重新登陆！');
			return $rs;
		}
        
        $where=[
            'uid'=>$uid,
            'isdef'=>1,
        ];
        

        $domain = new Domain_Addr();
		$info = $domain->getInfo($where);
        if($info){
            $rs['info'][0]=$info;
        }
        
        return $rs;
	}

    /**
     * 设置默认地址
     * @desc 用于设置默认地址
     * @return int code 操作码，0表示成功
     * @return array info 
     * @return string msg 提示信息
     */
	public function setDefault() {
        $rs = array('code' => 0, 'msg' => '', 'info' => array());

        $uid = \App\checkNull($this->uid);
        $token = \App\checkNull($this->token);
        $addrid = \App\checkNull($this->addrid);
        
        $checkToken=\App\checkToken($uid,$token);
		if($checkToken==700){
			$rs['code'] = $checkToken;
			$rs['msg'] = \PhalApi\T('您的登陆状态失效，请重新登陆！');
			return $rs;
		}
        
        if($addrid<0){
            $rs['code'] = 1001;
			$rs['msg'] = \PhalApi\T('信息错误');
			return $rs;
        }
        
        $data=[
            'uid'=>$uid,
            'addrid'=>$addrid,
        ];
        

        $domain = new Domain_Addr();
		$res = $domain->setDefault($data);
		
        return $res;
	}

    /**
     * 删除地址
     * @desc 用于删除地址
     * @return int code 操作码，0表示成功
     * @return array info 
     * @return string msg 提示信息
     */
	public function delAddr() {
        $rs = array('code' => 0, 'msg' => '', 'info' => array());

        $uid = \App\checkNull($this->uid);
        $token = \App\checkNull($this->token);
        $addrid = \App\checkNull($this->addrid);
        
        $checkToken=\App\checkToken($uid,$token);
		if($checkToken==700){
			$rs['code'] = $checkToken;
			$rs['msg'] = \PhalApi\T('您的登陆状态失效，请重新登陆！');
			return $rs;
		}
        
        if($addrid<0){
            $rs['code'] = 1001;
			$rs['msg'] = \PhalApi\T('信息错误');
			return $rs;
        }
        
        $data=[
            'uid'=>$uid,
            'addrid'=>$addrid,
        ];
        

        $domain = new Domain_Addr();
		$res = $domain->delAddr($data);
		
        return $res;
	}
    

}
