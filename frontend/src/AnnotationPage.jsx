import React, { useState, useEffect } from 'react';
import { Progress, Button, Input, Radio, Message } from '@arco-design/web-react';
import { Grid, Divider } from '@arco-design/web-react';
const Row = Grid.Row;
const Col = Grid.Col;

const AnnotationPage = () => {
    const [totalRows, setTotalRows] = useState(0);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [data, setData] = useState({});
    const [annotations, setAnnotations] = useState({});

    const [isHall, setIsHall] = useState(data.isHall || 1);
    const [hallType, setHallType] = useState(data.hallType || 1);
    const [sceType, setSceType] = useState(data.sceType || 1);

    const [userId, setUserId] = useState('defaultUser'); // 默认值

    useEffect(() => {
        setIsHall(data.isHall || 1);
        setHallType(data.hallType || 1);
        setSceType(data.sceType || 1);
    }, [data]);

    const handleIsHallChange = (value) => {
        setIsHall(value);
        setData((prevData) => ({ ...prevData, isHall: value }));
        // Here you might want to update the data object or notify parent component
    };

    const handleHallTypeChange = (value) => {
        setHallType(value);
        setData((prevData) => ({ ...prevData, hallType: value }));
        // Here you might want to update the data object or notify parent component
    };

    const handleSceTypeChange = (value) => {
        setSceType(value);
        setData((prevData) => ({ ...prevData, sceType: value }));

        // Here you might want to update the data object or notify parent component
    };

    useEffect(() => {
        fetch('/marking/get-total')
            .then(response => response.json())
            .then(data => setTotalRows(data.count))
            .catch(error => Message.error({content:'Failed to fetch total rows',position:'bottom'}));
        const params = new URLSearchParams(window.location.search);
        const userIdFromUrl = params.get('userid');
        if (userIdFromUrl) {
            setUserId(userIdFromUrl);
        }
    }, []);
    

    useEffect(() => {
        fetch(`/marking/get-data?index=${currentIndex}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch data');
                }
                return response.json(); // 确保将response解析为JSON
            })
            .then(data => {
                if (data && data.data) {
                    console.log(data.data)
                    setData(data.data);
                    setHallType(data.data.hallType);
                    setIsHall(data.data.isHall);
                    setSceType(data.data.sceType);
                } else {
                    throw new Error('Data is null or undefined');
                }
            })
            .catch(error => {
                console.error(error); // 打印错误信息以便调试
                Message.error({content:'Failed to fetch data',position:"bottom"});
            });
    }, [currentIndex]);

    const handlePrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const handleNext = () => {
        if (currentIndex < totalRows - 1) {
            setCurrentIndex(currentIndex + 1);
        }
    };

    const handleIndexChange = (value) => {
        const index = parseInt(value, 10);
        if (index >= 0 && index < totalRows) {
            setCurrentIndex(index);
        }
    };

    const handleAnnotationChange = (key, value) => {
        setAnnotations({ ...annotations, [key]: value });
    };

    const handleSubmit = () => {
        const payload = {
            index: currentIndex,
            image: data.image,
            hallType: hallType,
            isHall: isHall,
            sceType: sceType,
            userId: userId
        };
        fetch('/marking/set-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload), 
        })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    Message.success({content:'Data updated successfully',position:'bottom'});
                    handleNext();
                } else {
                    Message.error({content:'Failed to update data',position:'bottom'});

                }
            });
    };

    return (
        <div style={{ padding: 20 }}>

            <div style={{ margin: '20px 0' }}>
                <Row gutter={24}>
                    <Col span={8}>
                        <Progress percent={(currentIndex + 1) / totalRows * 100} />
                    </Col>
                    <Col span={16}>
                        <Button onClick={handlePrevious} disabled={currentIndex === 0}>上一个</Button>
                        {currentIndex + 1}/{totalRows}
                        <Button onClick={handleNext} disabled={currentIndex === totalRows - 1} style={{ marginLeft: 10 }}>下一个</Button>
                        <Input
                            style={{ width: 100, marginLeft: 10 }}
                            value={currentIndex}
                            onChange={handleIndexChange}
                            type="number"
                            min={0}
                            max={totalRows - 1}
                        />
                        <Button type="primary" onClick={handleSubmit}>提交</Button>
                    </Col>
                </Row>


            </div>
            <div>
                <Row gutter={24}>
                    <Col span={8}>
                        <img src={`data:image/jpeg;base64,${data.base64Image}`} alt="Image" style={{ width: '100%' }} />
                        <div style={{ marginBottom: 10 }}>
                            <strong>path:</strong> {data.image}
                        </div>
                    </Col>
                    <Col span={16}>
                        <div style={{ marginBottom: 10 }}>
                            <strong>Group 1 (isHall):</strong>
                            <Radio.Group value={isHall} onChange={handleIsHallChange}>
                                <Radio value={1}>是</Radio>
                                <Radio value={2}>否</Radio>
                                {/* <Radio value={3}>不确定</Radio> */}
                            </Radio.Group>
                        </div>
                        <div style={{ marginBottom: 10 }}>
                            <strong>Group 2 (hallType):</strong>
                            <Radio.Group value={hallType} onChange={handleHallTypeChange}>
                                <Radio value={1}>扭曲事实</Radio>
                                <Radio value={2}>编造事实</Radio>
                                <Radio value={3}>无关</Radio>
                                <Radio value={4}>推理错误</Radio>
                                <Radio value={5}>关注错误</Radio>
                            </Radio.Group>
                        </div>
                        <div style={{ marginBottom: 10 }}>
                            <strong>Group 3 (sceType):</strong>
                            <Radio.Group value={sceType} onChange={handleSceTypeChange}>
                                <Radio value={1}>家庭/维修 1</Radio>
                                <Radio value={2}>做饭/饮食</Radio>
                                <Radio value={3}>健康/护理</Radio>
                                <Radio value={4}>财务</Radio>
                                <Radio value={5}>娱乐</Radio>
                                <Radio value={6}>工作/学习</Radio>
                                <Radio value={7}>户外</Radio>
                                <Radio value={8}>服饰穿搭</Radio>
                            </Radio.Group>
                        </div>
                        <div style={{ marginBottom: 10 }}>
                            <strong>question:</strong> {data.question}
                        </div>
                        <div style={{ marginBottom: 10 }}>
                            <strong>answer_type:</strong> {data.answer_type}<strong>answerable:</strong> {data.answerable}
                        </div>

                        {[...Array(10)].map((_, i) => (
                            <Row key={i} gutter={24}>
                                <Col span={16}>
                                    <div style={{ marginBottom: 10 }}>
                                        <strong>{`A_${i + 1}`}:</strong> {data[`answer_${i + 1}`]}
                                    </div>
                                </Col>
                                <Col span={8}>
                                    <div style={{ marginBottom: 10 }}>
                                        <strong>{`conf`}:</strong> {data[`confidence_${i + 1}`]}
                                    </div>
                                </Col>
                            </Row>
                        ))}
                        <Divider />
                        {/* <div style={{ marginBottom: 10 }}>
                            <strong>VLM1:</strong> {data.VLM_response_round_1}
                        </div> */}
                        <div style={{ marginBottom: 10 }}>
                            <strong>VLM2:</strong> {data.VLM_response_round_2_with_resized_image}
                        </div>
                        <div style={{ marginBottom: 10 }}>
                            <strong>is_hall_auto:</strong> {data.is_hall_auto}
                        </div>
                        <div style={{ marginBottom: 10 }}>
                            <strong>scene_tag_auto:</strong> {data.scene_tag_auto}
                        </div>
                    </Col>
                </Row>
            </div>
        </div>
    );
};

export default AnnotationPage;
