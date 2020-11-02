<?php
namespace App\Model;

use PhalApi\Model\NotORMModel as NotORM;

class Addr extends NotORM {
	
	public function getList($where) {
		
		$list=\PhalApi\DI()->notorm->users_addrs
                ->select('*')
				->where($where)
                ->order('id desc')
				->fetchAll();

		return $list;
	}
    
    public function getInfo($where) {
		
		$info=\PhalApi\DI()->notorm->users_addrs
                ->select('*')
				->where($where)
				->fetchOne();

		return $info;
	}
    
    public function setAddr($data) {
		
		$rs=\PhalApi\DI()->notorm->users_addrs
				->insert($data);

		return $rs;
	}
    
    public function upAddr($where,$data) {
		
		$rs=\PhalApi\DI()->notorm->users_addrs
                ->where($where)
				->update($data);

		return $rs;
	}
    
    public function delAddr($where) {
		
		$rs=\PhalApi\DI()->notorm->users_addrs
                ->where($where)
				->delete();

		return $rs;
	}
	
	
}
