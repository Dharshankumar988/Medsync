import React, { useState, useRef, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, FlatList, StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { Send, Paperclip } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { aiService } from '../../services/ai.service';
import { PulseAIIcon } from './PulseAIIcon';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface PulseAIChatProps {
  role: 'doctor' | 'patient' | 'pharmacy' | 'admin';
}

const MARKDOWN_STYLES = {
  body: { fontSize: 15 },
  code_block: { backgroundColor: '#1F2937', color: '#F9FAFB', padding: 8, borderRadius: 8 },
  code_inline: { backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 4, paddingHorizontal: 4 }
};

const ChatBubble = React.memo(({ message }: { message: Message }) => {
  const isUser = message.role === 'user';
  
  return (
    <View style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowAssistant]}>
      <View style={[
        styles.bubble,
        isUser ? styles.bubbleUser : styles.bubbleAssistant,
      ]}>
        <Markdown 
          style={{
            ...MARKDOWN_STYLES,
            body: { ...MARKDOWN_STYLES.body, color: isUser ? '#FFFFFF' : '#111827' }
          }}
        >
          {message.content}
        </Markdown>
      </View>
    </View>
  );
});

export function PulseAIChat({ role }: PulseAIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const handleSend = useCallback(() => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const aiMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: aiMsgId, role: 'assistant', content: '' }]);

    aiService.streamChat(
      role,
      userMessage.content,
      null,
      (chunk) => {
        setMessages(prev => 
          prev.map(m => m.id === aiMsgId ? { ...m, content: m.content + chunk } : m)
        );
      },
      () => setIsLoading(false),
      (err) => {
        console.error(err);
        setIsLoading(false);
      }
    );
  }, [input, isLoading, role]);

  const handleAttach = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    
    if (!result.canceled && result.assets[0] && role === 'doctor') {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: '[Image Uploaded for Analysis]' }]);
    }
  }, [role]);

  const renderItem = useCallback(({ item }: { item: Message }) => {
    return <ChatBubble message={item} />;
  }, []);

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.chatArea}>
        {messages.length === 0 && (
          <View style={styles.emptyState}>
            <PulseAIIcon size={64} />
            <Text style={styles.emptyStateText}>
              How can I assist you today?
            </Text>
          </View>
        )}

        <FlatList 
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          ListFooterComponent={() => 
            isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' ? (
              <View style={styles.loadingBubble}>
                <ActivityIndicator color="#2563EB" size="small" />
              </View>
            ) : null
          }
        />
      </View>

      <View style={styles.inputArea}>
        <TouchableOpacity onPress={handleAttach} style={styles.attachBtn}>
          <Paperclip size={24} color="#6B7280" />
        </TouchableOpacity>
        
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask Pulse AI..."
          placeholderTextColor="#9CA3AF"
          style={styles.textInput}
          multiline
        />
        
        <TouchableOpacity 
          onPress={handleSend}
          disabled={!input.trim() || isLoading}
          style={[styles.sendBtn, (input.trim() && !isLoading) ? styles.sendBtnActive : styles.sendBtnInactive]}
        >
          <Send size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, 
    backgroundColor: '#F9FAFB'
  },
  chatArea: {
    flex: 1, 
    padding: 16
  },
  emptyState: {
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    opacity: 0.6
  },
  emptyStateText: {
    marginTop: 16, 
    fontSize: 16, 
    fontWeight: '500', 
    color: '#6B7280'
  },
  listContent: {
    gap: 16, 
    paddingBottom: 16
  },
  messageRow: {
    flexDirection: 'row', 
  },
  messageRowUser: {
    justifyContent: 'flex-end'
  },
  messageRowAssistant: {
    justifyContent: 'flex-start'
  },
  bubble: {
    maxWidth: '85%', 
    padding: 12, 
    borderRadius: 16, 
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  bubbleUser: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
    borderTopRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderTopLeftRadius: 4,
  },
  loadingBubble: {
    alignSelf: 'flex-start', 
    padding: 12, 
    backgroundColor: '#FFFFFF', 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: '#E5E7EB',
    marginTop: 16
  },
  inputArea: {
    padding: 16, 
    backgroundColor: '#FFFFFF', 
    borderTopWidth: 1, 
    borderTopColor: '#E5E7EB', 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12
  },
  attachBtn: {
    padding: 8
  },
  textInput: {
    flex: 1, 
    minHeight: 44, 
    maxHeight: 100, 
    backgroundColor: '#F3F4F6', 
    borderRadius: 20, 
    paddingHorizontal: 16, 
    paddingTop: 12, 
    paddingBottom: 12, 
    fontSize: 16, 
    color: '#111827'
  },
  sendBtn: {
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    justifyContent: 'center', 
    alignItems: 'center'
  },
  sendBtnActive: {
    backgroundColor: '#2563EB'
  },
  sendBtnInactive: {
    backgroundColor: '#93C5FD'
  }
});
