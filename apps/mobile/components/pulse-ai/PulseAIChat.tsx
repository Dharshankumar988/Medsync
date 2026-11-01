import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  FlatList,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import {
  Send,
  Paperclip,
  Sparkles,
  Bot,
  RotateCcw,
  Image as ImageIcon,
  ShieldAlert,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { aiService } from '../../services/ai.service';
import { PulseAIIcon } from './PulseAIIcon';
import { useTheme } from '../../context/ThemeContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUri?: string;
}

interface PulseAIChatProps {
  role?: 'doctor' | 'patient' | 'pharmacy' | 'admin';
}

const QUICK_PROMPTS = [
  '💊 Explain my medication schedule & side effects',
  '🩺 What do these symptoms typically indicate?',
  '📋 Explain my recent lab results in simple terms',
  '🥗 What foods should I avoid with antibiotics?',
];

export function PulseAIChat({ role = 'patient' }: PulseAIChatProps) {
  const { theme, isDark } = useTheme();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hello! I am **Pulse AI**, your dedicated MedSync clinical health assistant.\n\nAsk me about your symptoms, prescriptions, or tap the paperclip to upload a medical scan for analysis.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = useCallback(
    (textToSend?: string) => {
      const messageContent = (textToSend || input).trim();
      if (!messageContent || isLoading) return;

      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: messageContent,
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      setIsLoading(true);

      const aiMsgId = (Date.now() + 1).toString();
      setMessages((prev) => [...prev, { id: aiMsgId, role: 'assistant', content: '' }]);

      let receivedChunks = '';
      aiService.streamChat(
        role,
        userMessage.content,
        null,
        (chunk) => {
          receivedChunks += chunk;
          setMessages((prev) =>
            prev.map((m) => (m.id === aiMsgId ? { ...m, content: m.content + chunk } : m))
          );
        },
        () => setIsLoading(false),
        async () => {
          setIsLoading(false);
        }
      );
    },
    [input, isLoading, role]
  );

  const handleResetChat = () => {
    Alert.alert('Clear Chat', 'Start a fresh conversation with Pulse AI?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          setMessages([
            {
              id: 'welcome',
              role: 'assistant',
              content:
                'Hello! I am **Pulse AI**, your dedicated MedSync clinical health assistant.\n\nAsk me about your symptoms, prescriptions, or tap the paperclip to upload a medical scan for analysis.',
            },
          ]);
        },
      },
    ]);
  };

  const handleAttachImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setAnalyzingImage(true);
        const imageUri = result.assets[0].uri;

        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'user',
            content: 'Please analyze this medical scan/document.',
            imageUri,
          },
        ]);

        const analysis = await aiService.analyzeMedicalImage(imageUri, 'Analyze this medical document or diagnostic image.');
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: analysis.analysis || 'Image analyzed successfully.',
          },
        ]);
      }
    } catch (err: any) {
      Alert.alert('Analysis Failed', err?.message || 'Could not analyze image.');
    } finally {
      setAnalyzingImage(false);
    }
  };

  const markdownStyles = {
    body: {
      fontSize: 14.5,
      lineHeight: 21,
      color: theme.text,
    },
    code_block: {
      backgroundColor: isDark ? '#121215' : '#1E293B',
      color: '#FAFAFA',
      padding: 10,
      borderRadius: 10,
    },
    code_inline: {
      backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(37, 99, 235, 0.08)',
      color: isDark ? '#38BDF8' : '#0284C7',
      borderRadius: 4,
      paddingHorizontal: 4,
    },
    heading1: {
      fontSize: 17,
      fontWeight: '800' as const,
      marginVertical: 6,
      color: theme.text,
    },
    heading2: {
      fontSize: 15,
      fontWeight: '700' as const,
      marginVertical: 4,
      color: theme.text,
    },
    bullet_list: { marginVertical: 4 },
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Top Controls Bar */}
      <View
        style={[
          styles.topBar,
          {
            backgroundColor: theme.background,
            borderBottomColor: theme.border,
            justifyContent: 'flex-end',
            paddingVertical: 8,
          },
        ]}
      >
        <TouchableOpacity style={styles.resetBtn} onPress={handleResetChat} activeOpacity={0.75}>
          <RotateCcw size={15} color={theme.textMuted} style={{ marginRight: 6 }} />
          <Text style={{ fontSize: 12, color: theme.textMuted, fontWeight: '600' }}>New Consultation</Text>
        </TouchableOpacity>
      </View>

      {/* Messages Feed */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isUser = item.role === 'user';
          return (
            <View
              style={[
                styles.messageRow,
                isUser ? styles.messageRowUser : styles.messageRowAi,
              ]}
            >
              {!isUser && (
                <View
                  style={[
                    styles.aiAvatar,
                    {
                      backgroundColor: isDark ? '#27272A' : '#09090B',
                      borderColor: theme.border,
                      borderWidth: 1,
                    },
                  ]}
                >
                  <Sparkles size={16} color="#38BDF8" />
                </View>
              )}

              <View
                style={[
                  styles.bubble,
                  isUser
                    ? [
                        styles.bubbleUser,
                        {
                          backgroundColor: isDark ? '#FAFAFA' : '#09090B',
                        },
                      ]
                    : [
                        styles.bubbleAi,
                        {
                          backgroundColor: theme.card,
                          borderColor: theme.border,
                        },
                      ],
                ]}
              >
                <Markdown
                  style={{
                    ...markdownStyles,
                    body: {
                      ...markdownStyles.body,
                      color: isUser
                        ? isDark
                          ? '#09090B'
                          : '#FFFFFF'
                        : theme.text,
                    },
                  }}
                >
                  {item.content}
                </Markdown>
              </View>
            </View>
          );
        }}
        ListFooterComponent={() =>
          isLoading || analyzingImage ? (
            <View style={styles.typingIndicator}>
              <ActivityIndicator size="small" color="#38BDF8" />
              <Text style={[styles.typingText, { color: theme.textMuted }]}>
                {analyzingImage ? 'Reviewing medical image...' : 'Pulse AI is analyzing...'}
              </Text>
            </View>
          ) : null
        }
      />

      {/* Suggested Quick Prompts */}
      {messages.length <= 2 && (
        <View
          style={[
            styles.promptContainer,
            { backgroundColor: theme.background, borderTopColor: theme.border },
          ]}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.promptScroll}
          >
            {QUICK_PROMPTS.map((prompt, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.promptChip,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                  },
                ]}
                onPress={() => sendMessage(prompt)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.promptChipText,
                    { color: theme.textSecondary },
                  ]}
                >
                  {prompt}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Input Bar */}
      <View
        style={[
          styles.inputBar,
          {
            backgroundColor: theme.background,
            borderTopColor: theme.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={handleAttachImage}
          style={[
            styles.attachBtn,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
          accessibilityLabel="Attach Medical Image"
        >
          <ImageIcon size={19} color={theme.textMuted} />
        </TouchableOpacity>

        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask Pulse AI about your health..."
          placeholderTextColor={theme.inputPlaceholder}
          style={[
            styles.textInput,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              color: theme.text,
            },
          ]}
          multiline
        />

        <TouchableOpacity
          onPress={() => sendMessage()}
          disabled={!input.trim() || isLoading}
          style={[
            styles.sendBtn,
            input.trim() && !isLoading
              ? { backgroundColor: theme.primaryButton }
              : { backgroundColor: isDark ? '#27272A' : '#E4E4E7' },
          ]}
        >
          <Send
            size={17}
            color={
              input.trim() && !isLoading
                ? theme.primaryButtonText
                : theme.textMuted
            }
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  disclaimerText: {
    fontSize: 11.5,
    marginLeft: 6,
    flex: 1,
    fontWeight: '600',
  },
  resetBtn: {
    padding: 8,
    marginLeft: 8,
  },
  listContent: {
    padding: 16,
    paddingBottom: 20,
    gap: 12,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 4,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowAi: {
    justifyContent: 'flex-start',
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 2,
  },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
  },
  bubbleUser: {
    borderBottomRightRadius: 4,
  },
  bubbleAi: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 40,
    paddingVertical: 8,
  },
  typingText: {
    fontSize: 12.5,
    marginLeft: 8,
    fontWeight: '500',
  },
  promptContainer: {
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  promptScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  promptChip: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  promptChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  attachBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
