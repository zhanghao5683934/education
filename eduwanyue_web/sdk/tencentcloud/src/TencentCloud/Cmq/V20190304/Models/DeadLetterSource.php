<?php
/*
 * Copyright (c) 2017-2018 THL A29 Limited, a Tencent company. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
namespace TencentCloud\Cmq\V20190304\Models;
use TencentCloud\Common\AbstractModel;

/**
 * DeadLetterSource
 *
 * @method string getQueueId() 获取QueueId
注意：此字段可能返回 null，表示取不到有效值。
 * @method void setQueueId(string $QueueId) 设置QueueId
注意：此字段可能返回 null，表示取不到有效值。
 * @method string getQueueName() 获取QueueName
注意：此字段可能返回 null，表示取不到有效值。
 * @method void setQueueName(string $QueueName) 设置QueueName
注意：此字段可能返回 null，表示取不到有效值。
 */
class DeadLetterSource extends AbstractModel
{
    /**
     * @var string QueueId
注意：此字段可能返回 null，表示取不到有效值。
     */
    public $QueueId;

    /**
     * @var string QueueName
注意：此字段可能返回 null，表示取不到有效值。
     */
    public $QueueName;

    /**
     * @param string $QueueId QueueId
注意：此字段可能返回 null，表示取不到有效值。
     * @param string $QueueName QueueName
注意：此字段可能返回 null，表示取不到有效值。
     */
    function __construct()
    {

    }

    /**
     * For internal only. DO NOT USE IT.
     */
    public function deserialize($param)
    {
        if ($param === null) {
            return;
        }
        if (array_key_exists("QueueId",$param) and $param["QueueId"] !== null) {
            $this->QueueId = $param["QueueId"];
        }

        if (array_key_exists("QueueName",$param) and $param["QueueName"] !== null) {
            $this->QueueName = $param["QueueName"];
        }
    }
}
