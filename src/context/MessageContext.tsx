import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

type MessageType = 'success' | 'error' | 'warning' | 'info';

interface Message {
  id: string;
  text: string;
  type: MessageType;
}

interface MessageContextType {
  showMessage: (text: string, type?: MessageType) => void;
}

const MessageContext = createContext<MessageContextType | undefined>(undefined);

export function MessageProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);

  const showMessage = useCallback((text: string, type: MessageType = 'info') => {
    const id = Date.now().toString();
    setMessages(prev => [...prev, { id, text, type }]);
    
    setTimeout(() => {
      setMessages(prev => prev.filter(m => m.id !== id));
    }, 3000);
  }, []);

  const getTypeStyle = (type: MessageType) => {
    switch (type) {
      case 'success': return { backgroundColor: '#22c55e' };
      case 'error': return { backgroundColor: '#ef4444' };
      case 'warning': return { backgroundColor: '#f59e0b' };
      default: return { backgroundColor: '#6366f1' };
    }
  };

  const getIcon = (type: MessageType) => {
    switch (type) {
      case 'success': return '✓';
      case 'error': return '✕';
      case 'warning': return '⚠';
      default: return 'ℹ';
    }
  };

  return (
    <MessageContext.Provider value={{ showMessage }}>
      {children}
      <View style={styles.container}>
        {messages.map(msg => (
          <View key={msg.id} style={[styles.message, getTypeStyle(msg.type)]}>
            <Text style={styles.icon}>{getIcon(msg.type)}</Text>
            <Text style={styles.text}>{msg.text}</Text>
          </View>
        ))}
      </View>
    </MessageContext.Provider>
  );
}

export function useMessage() {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error('useMessage must be used within MessageProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    zIndex: 9999,
    gap: 8,
  },
  message: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  icon: {
    fontSize: 16,
    color: '#fff',
    marginRight: 8,
    fontWeight: 'bold',
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
});
