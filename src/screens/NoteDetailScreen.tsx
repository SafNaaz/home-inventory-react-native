import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, ScrollView, BackHandler, Alert, KeyboardAvoidingView, Platform, TouchableOpacity, Dimensions, Animated, TextInput as RNTextInput } from 'react-native';
import { useTheme, Button, IconButton, Text, Portal, Dialog, Checkbox } from 'react-native-paper';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { notesManager } from '../managers/NotesManager';
import { Note } from '../models/Types';
import DoodleBackground from '../components/DoodleBackground';

const { width } = Dimensions.get('window');

// Define constants outside to avoid re-creation and dependency issues
const BULLET_PREFIX = '\u2022 '; 
const CHECKBOX_PREFIX = '\u2610 ';
const CHECKED_PREFIX = '\u2611 ';

const NoteDetailScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { noteId, isNew = false, initialViewMode = true } = route.params || {};

  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isViewMode, setIsViewMode] = useState(initialViewMode);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRefs = useRef<any[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);

  // Animation values
  const sideMenuOpacity = useRef(new Animated.Value(0.2)).current;
  const scrollTimeout = useRef<any>(null);

  useEffect(() => {
    loadNote();
  }, [noteId]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        handleBack();
        return true;
      };
      BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, [isNew, isViewMode, note, title, content])
  );

  const loadNote = () => {
    if (!noteId) return;
    const loadedNote = notesManager.getNote(noteId);
    if (loadedNote) {
      setNote(loadedNote);
      setTitle(loadedNote.title || '');
      setContent(loadedNote.content || '');
    } else {
      navigation.goBack();
    }
  };

  const handleSave = async () => {
    if (!noteId) return;
    
    // Strict string check and cleanup
    const currentContent = typeof content === 'string' ? content : '';
    let lines = currentContent.split('\n');
    
    while (lines.length > 0) {
      const lastLine = lines[lines.length - 1] || '';
      const info = getLineInfo(lastLine);
      if ((info.type !== 'none' && info.text.trim() === '') || lastLine.trim() === '') {
        lines.pop();
      } else {
        break;
      }
    }
    
    const finalContent = lines.join('\n');
    setContent(finalContent);
    await notesManager.updateNote(noteId, title || '', finalContent);
    if (isNew) navigation.setParams({ isNew: false });
    setIsViewMode(true);
  };

  const handleBack = async () => {
    if (isNew) {
      await notesManager.deleteNote(noteId);
      navigation.goBack();
    } else if (!isViewMode) {
      if (note) {
        setTitle(note.title || '');
        setContent(note.content || '');
      }
      setIsViewMode(true);
    } else {
      navigation.goBack();
    }
  };

  const handleDelete = async () => {
    await notesManager.deleteNote(noteId);
    navigation.goBack();
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: isViewMode ? 'View' : (isNew ? 'New Note' : 'Edit'),
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {!isViewMode && !isNew && (
            <IconButton icon="delete" iconColor={theme.colors.error} onPress={() => setDeleteConfirmVisible(true)} />
          )}
          {isViewMode ? (
            <IconButton icon="pencil" iconColor={theme.colors.primary} onPress={() => setIsViewMode(false)} />
          ) : (
            <Button onPress={handleSave} mode="text" labelStyle={{ fontWeight: 'bold' }}>Save</Button>
          )}
        </View>
      ),
    });
  }, [navigation, isViewMode, isNew, theme, title, content]);

  const getLineInfo = (line: string) => {
    const safeLine = typeof line === 'string' ? line : '';
    if (safeLine.startsWith(BULLET_PREFIX)) return { type: 'bullet', text: safeLine.substring(BULLET_PREFIX.length), isChecked: false };
    if (safeLine.startsWith(CHECKBOX_PREFIX)) return { type: 'checkbox', text: safeLine.substring(CHECKBOX_PREFIX.length), isChecked: false };
    if (safeLine.startsWith(CHECKED_PREFIX)) return { type: 'checkbox', text: safeLine.substring(CHECKED_PREFIX.length), isChecked: true };
    return { type: 'none', text: safeLine, isChecked: false };
  };

  const toggleLineCheckbox = useCallback((index: number) => {
    if (index < 0) return;
    
    setContent((prev) => {
      const currentContent = typeof prev === 'string' ? prev : '';
      const lines = currentContent.split('\n');
      if (index >= lines.length) return currentContent;
      
      const line = lines[index] || '';
      let updatedLine = line;
      
      if (line.startsWith(CHECKBOX_PREFIX)) {
        updatedLine = CHECKED_PREFIX + line.substring(CHECKBOX_PREFIX.length);
      } else if (line.startsWith(CHECKED_PREFIX)) {
        updatedLine = CHECKBOX_PREFIX + line.substring(CHECKED_PREFIX.length);
      }
      
      if (updatedLine === line) return currentContent;
      
      lines[index] = updatedLine;
      const finalVal = lines.join('\n');
      
      // Background save if in view mode
      if (isViewMode && noteId) {
        notesManager.updateNote(noteId, title || '', finalVal);
      }
      
      return finalVal;
    });
    showMenu();
  }, [noteId, title, isViewMode]);

  const createNewLine = (index: number) => {
    const safeContent = typeof content === 'string' ? content : '';
    const lines = safeContent.split('\n');
    const currentLine = lines[index] || '';
    let prefix = '';
    
    if (currentLine.startsWith(BULLET_PREFIX)) prefix = BULLET_PREFIX;
    else if (currentLine.startsWith(CHECKBOX_PREFIX) || currentLine.startsWith(CHECKED_PREFIX)) prefix = CHECKBOX_PREFIX;
    
    lines.splice(index + 1, 0, prefix);
    setContent(lines.join('\n'));
    setTimeout(() => {
      inputRefs.current[index + 1]?.focus();
      scrollToIndex(index + 1);
    }, 50);
  };

  const scrollToIndex = (index: number) => {
    setTimeout(() => {
        if (scrollViewRef.current) {
            scrollViewRef.current.scrollTo({ y: Math.max(0, index * 44 - 100), animated: true });
        }
    }, 100);
  };

  const updateLine = (index: number, text: string) => {
    const safeText = typeof text === 'string' ? text : '';
    const safeContent = typeof content === 'string' ? content : '';
    const lines = safeContent.split('\n');
    const oldInfo = getLineInfo(lines[index] || '');
    let prefix = '';
    
    if (oldInfo.type === 'bullet') prefix = BULLET_PREFIX;
    else if (oldInfo.type === 'checkbox') prefix = oldInfo.isChecked ? CHECKED_PREFIX : CHECKBOX_PREFIX;

    if (safeText.includes('\n')) {
        lines[index] = prefix + safeText.replace(/\n/g, '');
        setContent(lines.join('\n'));
        createNewLine(index);
        return;
    }

    lines[index] = prefix + safeText;
    setContent(lines.join('\n'));
    showMenu();
  };

  const handleKeyPress = (index: number, e: any) => {
    const key = e.nativeEvent.key;
    const safeContent = typeof content === 'string' ? content : '';
    const lines = safeContent.split('\n');
    
    if (key === 'Backspace' && (lines[index] === '' || lines[index] === BULLET_PREFIX || lines[index] === CHECKBOX_PREFIX || lines[index] === CHECKED_PREFIX) && lines.length > 2) {
      lines.splice(index, 1);
      setContent(lines.join('\n'));
      setTimeout(() => {
        inputRefs.current[index - 1]?.focus();
      }, 50);
    }
  };

  const toggleLineStyle = (type: 'bullet' | 'checkbox') => {
    const safeContent = typeof content === 'string' ? content : '';
    const lines = safeContent.split('\n');
    let line = lines[focusedIndex] || '';
    const info = getLineInfo(line);

    if (type === 'bullet') {
      lines[focusedIndex] = info.type === 'bullet' ? info.text : BULLET_PREFIX + info.text;
    } else {
      lines[focusedIndex] = info.type === 'checkbox' ? info.text : CHECKBOX_PREFIX + info.text;
    }
    setContent(lines.join('\n'));
    showMenu();
  };

  const showMenu = () => {
    Animated.timing(sideMenuOpacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
       if (!isViewMode) Animated.timing(sideMenuOpacity, { toValue: 0.2, duration: 600, useNativeDriver: true }).start();
    }, 4000);
  };

  if (!note) return <View style={styles.container} />;

  const lines = (typeof content === 'string' ? content : '').split('\n');
  const focusedLineInfo = getLineInfo(lines[focusedIndex] || '');

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <DoodleBackground />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <View style={styles.mainLayout}>
          <ScrollView 
            ref={scrollViewRef}
            style={styles.content}
            contentContainerStyle={{ paddingBottom: 150 }}
            keyboardShouldPersistTaps="handled"
            onScroll={showMenu}
            scrollEventThrottle={16}
          >
            <View style={styles.titleSection}>
              <RNTextInput
                placeholder="Title"
                value={title || ''}
                onChangeText={setTitle}
                editable={!isViewMode}
                style={[styles.titleInput, { color: theme.colors.onBackground }]}
                placeholderTextColor={theme.colors.onSurfaceVariant}
              />
            </View>

            <View style={styles.editorContentWrapper}>
              {lines.map((line, index) => {
                const info = getLineInfo(line);
                const isItemChecked = info.isChecked;
                const isStrikethrough = isItemChecked && isViewMode;
                
                return (
                  <View key={index} style={[styles.lineRow, { paddingLeft: info.type !== 'none' ? 4 : 16 }]}>
                    {info.type !== 'none' && (
                      <View style={styles.prefixContainer}>
                        {info.type === 'bullet' && (
                          <MaterialCommunityIcons 
                            name="circle" 
                            size={10} 
                            color={theme.colors.primary} 
                          />
                        )}
                        {info.type === 'checkbox' && (
                          <TouchableOpacity 
                            onPress={() => toggleLineCheckbox(index)} 
                            activeOpacity={0.7} 
                            hitSlop={{top:10, bottom:10, left:10, right:10}}
                          >
                            <MaterialCommunityIcons 
                              name={isItemChecked ? "checkbox-marked" : "checkbox-blank-outline"} 
                              size={20} 
                              color={theme.colors.primary} 
                            />
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                    
                    <RNTextInput
                      ref={el => inputRefs.current[index] = el}
                      value={info.text || ''}
                      onChangeText={(text) => updateLine(index, text)}
                      onFocus={() => { 
                        setFocusedIndex(index); 
                        showMenu();
                        scrollToIndex(index);
                      }}
                      onKeyPress={(e) => handleKeyPress(index, e)}
                      editable={!isViewMode}
                      multiline={true}
                      style={[
                        styles.lineInput, 
                        { color: isStrikethrough ? theme.colors.onSurfaceVariant : theme.colors.onSurface },
                        isStrikethrough ? styles.strikethroughText : { textDecorationLine: 'none' }
                      ]}
                      textAlignVertical="top"
                      placeholder={index === 0 && (info.text || '') === '' ? "Start writing..." : ""}
                      placeholderTextColor={theme.colors.onSurfaceVariant}
                    />
                  </View>
                );
              })}
            </View>
          </ScrollView>

          {!isViewMode && (
            <Animated.View style={[
              styles.sideToolbarFixed, 
              { 
                opacity: sideMenuOpacity,
                backgroundColor: theme.dark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.8)' 
              }
            ]}>
              <IconButton
                icon="format-list-bulleted"
                onPress={() => toggleLineStyle('bullet')}
                iconColor={focusedLineInfo.type === 'bullet' ? theme.colors.primary : theme.colors.onSurfaceVariant}
                containerColor={focusedLineInfo.type === 'bullet' ? theme.colors.primaryContainer : undefined}
                size={22}
              />
              <IconButton
                icon="checkbox-marked-outline"
                onPress={() => toggleLineStyle('checkbox')}
                iconColor={focusedLineInfo.type === 'checkbox' ? theme.colors.primary : theme.colors.onSurfaceVariant}
                containerColor={focusedLineInfo.type === 'checkbox' ? theme.colors.primaryContainer : undefined}
                size={22}
              />
              <View style={styles.spacer} />
              <Text style={styles.charCountSmall}>{(content || '').length}</Text>
            </Animated.View>
          )}
        </View>
      </KeyboardAvoidingView>

      <Portal>
        <Dialog visible={deleteConfirmVisible} onDismiss={() => setDeleteConfirmVisible(false)}>
          <Dialog.Title>Delete Note</Dialog.Title>
          <Dialog.Content><Text>Delete this note forever?</Text></Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteConfirmVisible(false)}>No</Button>
            <Button onPress={handleDelete} textColor={theme.colors.error}>Yes, Delete</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

// Helper for safer route usage
const routeSync = () => {
    // This is just a dummy to satisfy the structure if needed
    return {};
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  mainLayout: { flex: 1, flexDirection: 'row' },
  content: { flex: 1 },
  titleSection: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10 },
  titleInput: { fontSize: 24, fontWeight: 'bold', padding: 0 },
  editorContentWrapper: { paddingRight: 40 },
  lineRow: { 
    flexDirection: 'row', 
    alignItems: 'flex-start',
    minHeight: 40,
    marginVertical: 2,
  },
  prefixContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 0,
    marginTop: 4,
  },
  lineInput: { 
    flex: 1, 
    fontSize: 18, 
    lineHeight: 24,
    minHeight: 32,
    padding: 0,
    marginTop: 8,
    textAlignVertical: 'top',
  },
  strikethroughText: { 
    textDecorationLine: 'line-through',
  },
  sideToolbarFixed: {
    position: 'absolute',
    right: 4,
    top: 100,
    width: 38,
    borderRadius: 19,
    paddingVertical: 8,
    alignItems: 'center',
    elevation: 4,
    zIndex: 10,
  },
  spacer: { height: 10 },
  charCountSmall: { fontSize: 8, opacity: 0.5, fontWeight: 'bold' }
});

export default NoteDetailScreen;
