import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import styles from './ChatApp.module.css';
import ChatHeader from '../ChatHeader/ChatHeader';
import ChatMessages from '../ChatMessages/ChatMessages';
import ChatInput from '../ChatInput/ChatInput';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRobot } from '@fortawesome/free-solid-svg-icons';

import config from '../../config';
import {covert_to_html, count_continuous_button, covert_to_gpt_entity} from './Convert';

function ChatApp(){
  const [chatOpen, setChatOpen] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(true);
  const [flow, setFlow] = useState(null);

  useEffect(() => {
    console.log('flow 值改變:', flow);
  }, [flow]);


  const toggleChat = () => {
    if(!chatOpen) setIsFullScreen(false);
    setChatOpen(!chatOpen);
  };

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  // Here is your messages
  const isInitialMount = useRef(true); //為了避免初次渲染時，呼叫到 addMessages
  const [messages, setMessages] = useState([
    // {
    //     from: "system",
    //     text: "Hello, nice to meet you!" 
    // },
    // {
    //     from: "user",
    //     text: "I want to ask..." 
    // }
  ]);
  
  useEffect(()=>{
    console.log("紀錄: ");
    console.log(messages);
  }, [messages]);

  const timeoutRef = useRef(null);
  const addMessage = async (newMessage) => {

    let need_remove = messages.length > 0 && messages[messages.length - 1].buttonData;

    setMessages(prevMessages => [
      ...(
        need_remove ? prevMessages.slice(0, -1) : prevMessages // 根據條件選擇是否移除最後一項
      ),
      { from: 'user', text: newMessage },  // 新訊息
      { from: 'system', text: '等待中...(系統會在20秒內進行回覆)' } // 告知等待中
    ]);

    // 設置 timeout 計時器(20s)
    timeoutRef.current = setTimeout(() => {
      setMessages((prevMessages) => [
        ...prevMessages.slice(0, -1),
        {
          from: 'system', 
          text: ( 
          <>
            系統無法回答您的問題，請見諒!
            <br />
            您可以換個問題或是重新發問，謝謝!!
          </>
          ),
        },
      ]);
    }, 25000);

    try {
      const response = await axios.post(config.apiChat, { user: newMessage, flow: flow });
      const res = response.data.response;
      console.log(`回覆: ${res}`);

      // 清除 timeout (已收到回覆)
      clearTimeout(timeoutRef.current);
  
      // 刪除等待中的訊息，並加上新的回覆
      setMessages(prevMessages => [
        ...prevMessages.slice(0, -1),  // 移除「等待中」
        ...deal_response(res)  // 
      ]);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // 處理 timeout 計時器
  useEffect(() => {
    return () => {
      clearTimeout(timeoutRef.current);
    };
  }, []);

  // 處理功能 START
  const [intent, setIntent] = useState("");
  useEffect(() => {
    if (isInitialMount.current || intent=="") {
      isInitialMount.current = false;
    } else {
      addMessage(intent);
    }
    setIntent("");
  }, [intent]);
  // 處理功能 END

  useEffect(()=>{
    axios.get(config.apiGreeting)
      .then(res => {
        // 處理 API 回應數據
        console.log(res);
        let tempMessages = deal_response(res["data"]["response"]);

        console.log("處理完的:");
        console.log(tempMessages);

        setMessages(prevMessages => ([
          ...prevMessages, ...tempMessages
        ]));
      })
      .catch(error => {
        // 處理錯誤
        console.error('Error sending message:', error);
      });
  }, []);

  const deal_response = (res) =>{
    let tempMessages = [];
    // let submitButton = false;

    if(res!=undefined){
      for (let i = 0; i < res.length; i++) {
        console.log(`deal response: ${i}`);
        let html = '';
        try {
          if(res[i]["ui_type"]=='button'){
            // submitButton = true;
            let end = count_continuous_button(res, i, setFlow);
            let button_data = [];
            for(let j=i; j<=end; j++){
              button_data.push(res[j]["data"][res[j]["ui_type"]])
              // html += covert_to_html(`to_${res[i]["ui_type"]}`, res[i]["data"][res[i]["ui_type"]]);
            }
            i = end;
  
            tempMessages.push({
              from: 'system',
              buttonData: button_data
            });
          }
          else{
            html = covert_to_html(`to_${res[i]["ui_type"]}`, res[i]["data"][res[i]["ui_type"]], setFlow);
            
            // 在發送成功後更新本地狀態
            tempMessages.push({
              from: 'system',
              text: html
            });
          }
        } catch (error) {
          console.log('錯誤訊息: ');
          console.error(error.message);
        }
      }
    }

    // if(submitButton){
    //   tempMessages.push({
    //     from: 'system',
    //     buttonData: {}
    //   });
    // }
    //console.log(`處理 response: `);
    //console.log(tempMessages);
    return tempMessages;
  }

  return (
    <div className={`${styles.chatApp} ${isFullScreen ? styles.fullScreen : (chatOpen ? styles.notFullScreen : '')}`}>
      {chatOpen && (
        <>
          <ChatHeader onMinimize={toggleChat} onFullScreen={toggleFullScreen} />
          <ChatMessages messages={messages} onSetIntent={setIntent} onSetFlow={setFlow}/>
          <ChatInput onSendMessage={addMessage} />
        </>
      )}
        <div onClick={toggleChat}>
            {!chatOpen && (
                <FontAwesomeIcon className={styles.chatIcon} icon={faRobot} size='lg'/>
            )}
        </div>

    </div>
  );
}

export default ChatApp;
