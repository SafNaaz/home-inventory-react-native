import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, BackHandler, KeyboardAvoidingView, Platform, TouchableOpacity, Dimensions, Animated, TextInput as RNTextInput, Keyboard, Alert, Share } from 'react-native';
import { useTheme, Button, IconButton, Text, Portal, Dialog, Snackbar } from 'react-native-paper';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { notesManager } from '../managers/NotesManager';
import { Note } from '../models/Types';
import DoodleBackground from '../components/DoodleBackground';
import * as Clipboard from 'expo-clipboard';

// Define constants outside to avoid re-creation and dependency issues
const BULLET_PREFIX = '\u2022 '; 
const CHECKBOX_PREFIX = '\u2610 ';
const CHECKED_PREFIX = '\u2611 ';

const getLineInfo = (line: string) => {
  const safeLine = typeof line === 'string' ? line : '';
  if (safeLine.startsWith(BULLET_PREFIX)) return { type: 'bullet' as const, text: safeLine.substring(BULLET_PREFIX.length), isChecked: false };
  if (safeLine.startsWith(CHECKBOX_PREFIX)) return { type: 'checkbox' as const, text: safeLine.substring(CHECKBOX_PREFIX.length), isChecked: false };
  if (safeLine.startsWith(CHECKED_PREFIX)) return { type: 'checkbox' as const, text: safeLine.substring(CHECKED_PREFIX.length), isChecked: true };
  return { type: 'none' as const, text: safeLine, isChecked: false };
};

// ─── Memoized Line Component ────────────────────────────────────────────
interface LineRowProps {
  line: string;
  index: number;
  isViewMode: boolean;
  primaryColor: string;
  onSurfaceColor: string;
  onSurfaceVariantColor: string;
  onUpdateLine: (index: number, text: string) => void;
  onFocusLine: (index: number) => void;
  onKeyPress: (index: number, e: any) => void;
  onToggleCheckbox: (index: number) => void;
  onLayoutLine: (index: number, y: number) => void;
  inputRef: (index: number, el: any) => void;
}

const LineRow = React.memo<LineRowProps>(({
  line,
  index,
  isViewMode,
  primaryColor,
  onSurfaceColor,
  onSurfaceVariantColor,
  onUpdateLine,
  onFocusLine,
  onKeyPress,
  onToggleCheckbox,
  onLayoutLine,
  inputRef,
}) => {
  const info = getLineInfo(line);
  const isItemChecked = info.isChecked;
  const isStrikethrough = isItemChecked && isViewMode;

  const handleChangeText = useCallback((text: string) => {
    onUpdateLine(index, text);
  }, [index, onUpdateLine]);

  const handleFocus = useCallback(() => {
    onFocusLine(index);
  }, [index, onFocusLine]);

  const handleKeyPress = useCallback((e: any) => {
    onKeyPress(index, e);
  }, [index, onKeyPress]);

  const handleLayout = useCallback((e: any) => {
    onLayoutLine(index, e.nativeEvent.layout.y);
  }, [index, onLayoutLine]);

  const handleToggle = useCallback(() => {
    onToggleCheckbox(index);
  }, [index, onToggleCheckbox]);

  const setRef = useCallback((el: any) => {
    inputRef(index, el);
  }, [index, inputRef]);

  return (
    <View
      style={[styles.lineRow, { paddingLeft: info.type !== 'none' ? 4 : 16 }]}
      onLayout={handleLayout}
    >
      {info.type !== 'none' && (
        <View style={styles.prefixContainer}>
          {info.type === 'bullet' && (
            <MaterialCommunityIcons
              name="circle"
              size={10}
              color={primaryColor}
            />
          )}
          {info.type === 'checkbox' && (
            <TouchableOpacity
              onPress={handleToggle}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialCommunityIcons
                name={isItemChecked ? 'checkbox-marked' : 'checkbox-blank-outline'}
                size={20}
                color={primaryColor}
              />
            </TouchableOpacity>
          )}
        </View>
      )}

      <RNTextInput
        ref={setRef}
        value={info.text || ''}
        onChangeText={handleChangeText}
        onFocus={handleFocus}
        onKeyPress={handleKeyPress}
        editable={!isViewMode}
        multiline={true}
        style={[
          styles.lineInput,
          { color: isStrikethrough ? onSurfaceVariantColor : onSurfaceColor },
          isStrikethrough ? styles.strikethroughText : styles.noStrikethrough,
        ]}
        textAlignVertical="top"
        placeholder={index === 0 && (info.text || '') === '' ? 'Start writing...' : ''}
        placeholderTextColor={onSurfaceVariantColor}
      />
    </View>
  );
}, (prev, next) => {
  // Custom comparator — only re-render if something we care about changed
  return (
    prev.line === next.line &&
    prev.index === next.index &&
    prev.isViewMode === next.isViewMode &&
    prev.primaryColor === next.primaryColor &&
    prev.onSurfaceColor === next.onSurfaceColor &&
    prev.onSurfaceVariantColor === next.onSurfaceVariantColor
    // callbacks are stable via useCallback in parent, skip comparing
  );
});

// ─── Main Screen ────────────────────────────────────────────────────────
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
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const scrollViewRef = useRef<ScrollView>(null);
  const inputRefs = useRef<any[]>([]);
  const titleInputRef = useRef<RNTextInput>(null);
  const sideMenuOpacity = useRef(new Animated.Value(0.2)).current;
  const scrollTimeout = useRef<any>(null);
  const lineYPositions = useRef<Record<number, number>>({});
  const pendingFocusRef = useRef<number | null>(null);
  const [unsavedDialogVisible, setUnsavedDialogVisible] = useState(false);
  const [duplicateConfirmVisible, setDuplicateConfirmVisible] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const pendingActionRef = useRef<any>(null); // For storing navigation action or callback

  // Refs to avoid stale closures in effects that shouldn't re-run on every keystroke
  const contentRef = useRef(content);
  contentRef.current = content;
  const titleRef = useRef(title);
  titleRef.current = title;
  const noteRef = useRef(note);
  noteRef.current = note;
  const isViewModeRef = useRef(isViewMode);
  isViewModeRef.current = isViewMode;
  const keyboardHeightRef = useRef(keyboardHeight);
  keyboardHeightRef.current = keyboardHeight;
  const isNewRef = useRef(isNew);
  isNewRef.current = isNew;

  // ─── Effects ────────────────────────────────────────────────────────
  useEffect(() => {
    loadNote();
  }, [noteId]);

  // Track keyboard height for dynamic padding
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: any) => setKeyboardHeight(e.endCoordinates.height);
    const onHide = () => setKeyboardHeight(0);

    const subShow = Keyboard.addListener(showEvent, onShow);
    const subHide = Keyboard.addListener(hideEvent, onHide);
    return () => { subShow.remove(); subHide.remove(); };
  }, []);

  // Post-render focus: runs after React finishes rendering new lines
  useEffect(() => {
    if (pendingFocusRef.current !== null) {
      const idx = pendingFocusRef.current;
      pendingFocusRef.current = null;
      // Use requestAnimationFrame to ensure the native view is ready
      requestAnimationFrame(() => {
        inputRefs.current[idx]?.focus();
        const yPos = lineYPositions.current[idx];
        if (scrollViewRef.current && yPos !== undefined) {
          const screenH = Dimensions.get('window').height;
          const visibleArea = screenH - keyboardHeightRef.current;
          const targetOffset = Math.max(0, yPos - visibleArea * 0.35);
          scrollViewRef.current.scrollTo({ y: targetOffset, animated: true });
        }
      });
    }
  }, [content]);

  // Back handler — uses refs so we don't re-register on every keystroke
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        handleBackViaRef();
        return true;
      };
      BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, []) // stable — reads from refs
  );

  // Header — only re-set when mode changes, not on every keystroke
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: isViewMode ? 'View' : (isNew ? 'New Note' : 'Edit'),
      headerRight: () => (
        <View style={headerRightStyle}>
          {isViewMode && (
            <>
             <IconButton icon="share-variant" iconColor={theme.colors.primary} onPress={handleShare} />
             <IconButton icon="content-copy" iconColor={theme.colors.primary} onPress={handleCopy} />
             <IconButton icon="content-duplicate" iconColor={theme.colors.primary} onPress={handleDuplicate} />
            </>
          )}
          {!isViewMode && !isNew && (
            <IconButton icon="delete" iconColor={theme.colors.error} onPress={() => setDeleteConfirmVisible(true)} />
          )}
          {isViewMode ? (
            <IconButton icon="pencil" iconColor={theme.colors.primary} onPress={() => setIsViewMode(false)} />
          ) : (
            <Button onPress={handleSaveFromRef} mode="text" labelStyle={saveLabelStyle}>Save</Button>
          )}
        </View>
      ),
    });
  }, [navigation, isViewMode, isNew, theme]);

  // ─── Core Functions ────────────────────────────────────────────────
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

  // Save that reads from refs (for header button)
  const handleSaveFromRef = useCallback(async () => {
    if (!noteId) return;
    const currentContent = typeof contentRef.current === 'string' ? contentRef.current : '';
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
    await notesManager.updateNote(noteId, titleRef.current || '', finalContent);
    if (isNewRef.current) navigation.setParams({ isNew: false });
    setIsViewMode(true);
  }, [noteId]);

  // Back that reads from refs — isNewRef ensures we always have the latest value
  const handleBackViaRef = useCallback(async () => {
    // Check for unsaved changes first (Custom Dialog)
    const currentTitle = titleRef.current || '';
    const currentContent = typeof contentRef.current === 'string' ? contentRef.current : '';
    const originalTitle = noteRef.current?.title || '';
    const originalContent = typeof noteRef.current?.content === 'string' ? noteRef.current?.content : '';
    
    const isDirty = (currentTitle !== originalTitle || currentContent !== originalContent) && !isViewModeRef.current;

    if (isDirty) {
      pendingActionRef.current = { type: 'hardware_back' };
      setUnsavedDialogVisible(true);
      return;
    }

    if (isNewRef.current) {
      await notesManager.deleteNote(noteId);
      navigation.goBack();
    } else if (!isViewModeRef.current) {
      const n = noteRef.current;
      if (n) {
        setTitle(n.title || '');
        setContent(n.content || '');
      }
      setIsViewMode(true);
    } else {
      navigation.goBack();
    }
  }, [noteId]);

  // Intercept Swipe Back / Header Back
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      if (isViewModeRef.current) return;
      
      const currentTitle = titleRef.current || '';
      const currentContent = typeof contentRef.current === 'string' ? contentRef.current : '';
      const originalTitle = noteRef.current?.title || '';
      const originalContent = typeof noteRef.current?.content === 'string' ? noteRef.current?.content : '';
      const isDirty = currentTitle !== originalTitle || currentContent !== originalContent;

      if (!isDirty) {
        if (isNewRef.current) {
             // Cleanup if needed, usually handled by nav action if not prevented
        }
        return;
      }

      e.preventDefault();
      
      pendingActionRef.current = { type: 'navigation', action: e.data.action };
      setUnsavedDialogVisible(true);
    });

    return unsubscribe;
  }, [navigation, noteId]);

  const handleUnsavedDiscard = async () => {
    setUnsavedDialogVisible(false);
    const action = pendingActionRef.current;
    
    // CRITICAL: Prevent beforeRemove from firing again by setting view mode
    isViewModeRef.current = true;
    setIsViewMode(true);

    if (isNewRef.current) {
      // Check if it exists before trying to delete to avoid errors
      if (notesManager.getNote(noteId)) {
        await notesManager.deleteNote(noteId);
      }
    } else {
      // Revert changes in local state (optional since we are leaving, but good for cleanup)
      const n = noteRef.current;
      if (n) {
        setTitle(n.title || '');
        setContent(n.content || '');
      }
    }

    if (action?.type === 'navigation') {
      navigation.dispatch(action.action);
    } else if (action?.type === 'hardware_back') {
       navigation.goBack();
    }
    pendingActionRef.current = null;
  };

  const handleUnsavedSave = async () => {
    setUnsavedDialogVisible(false);
    await handleSaveFromRef();
    const action = pendingActionRef.current;

    if (action?.type === 'navigation') {
      navigation.dispatch(action.action);
    } else if (action?.type === 'hardware_back') {
       // Save already sets view mode to true.
       if (isNewRef.current) {
         navigation.goBack();
       } 
       // If existing note, handleSaveFromRef switches to ViewMode, which is what we want.
    }
    pendingActionRef.current = null;
  };

  const handleDuplicate = useCallback(() => {
    setDuplicateConfirmVisible(true);
  }, []);

  const onConfirmDuplicate = useCallback(async () => {
    setDuplicateConfirmVisible(false);
    const newNote = await notesManager.duplicateNote(noteId);
    if (newNote) {
      setSnackbarMessage('Note duplicated successfully');
      setSnackbarVisible(true);
    }
  }, [noteId]);

  const handleDelete = useCallback(async () => {
    await notesManager.deleteNote(noteId);
    navigation.goBack();
  }, [noteId]);

  const handleCopy = useCallback(async () => {
    const titleText = titleRef.current || 'Untitled';
    const contentText = contentRef.current || '';
    
    // Format text specifically for sharing/clipboard
    const formattedText = `${titleText}\n\n${contentText}`;
    
    await Clipboard.setStringAsync(formattedText);
    setSnackbarMessage('Note copied to clipboard');
    setSnackbarVisible(true);
  }, []);

  const handleShare = useCallback(async () => {
    const titleText = titleRef.current || 'Untitled';
    const contentText = contentRef.current || '';
    const formattedText = `${titleText}\n\n${contentText}`;

    try {
      await Share.share({
        message: formattedText,
        title: titleText, // Android only
      });
    } catch (error: any) {
      setSnackbarMessage('Error sharing note');
      setSnackbarVisible(true);
    }
  }, []);

  // ─── Editor Callbacks (stable) ────────────────────────────────────
  const showMenu = useCallback(() => {
    Animated.timing(sideMenuOpacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      if (!isViewModeRef.current) {
        Animated.timing(sideMenuOpacity, { toValue: 0.2, duration: 600, useNativeDriver: true }).start();
      }
    }, 4000);
  }, []);

  const scrollToIndex = useCallback((index: number) => {
    const yPos = lineYPositions.current[index];
    if (scrollViewRef.current && yPos !== undefined) {
      const screenH = Dimensions.get('window').height;
      const visibleArea = screenH - keyboardHeightRef.current;
      const targetOffset = Math.max(0, yPos - visibleArea * 0.35);
      scrollViewRef.current.scrollTo({ y: targetOffset, animated: true });
    }
  }, []);

  const onUpdateLine = useCallback((index: number, text: string) => {
    const safeText = typeof text === 'string' ? text : '';
    const hasNewline = safeText.includes('\n');

    // Set pending focus BEFORE state update so the useEffect picks it up
    if (hasNewline) {
      pendingFocusRef.current = index + 1;
    }

    setContent((prev) => {
      const safeContent = typeof prev === 'string' ? prev : '';
      const lines = safeContent.split('\n');
      const oldInfo = getLineInfo(lines[index] || '');
      let prefix = '';
      if (oldInfo.type === 'bullet') prefix = BULLET_PREFIX;
      else if (oldInfo.type === 'checkbox') prefix = oldInfo.isChecked ? CHECKED_PREFIX : CHECKBOX_PREFIX;

      if (hasNewline) {
        lines[index] = prefix + safeText.replace(/\n/g, '');
        let newLinePrefix = '';
        if (prefix === BULLET_PREFIX) newLinePrefix = BULLET_PREFIX;
        else if (prefix === CHECKBOX_PREFIX || prefix === CHECKED_PREFIX) newLinePrefix = CHECKBOX_PREFIX;
        lines.splice(index + 1, 0, newLinePrefix);
        return lines.join('\n');
      }

      lines[index] = prefix + safeText;
      return lines.join('\n');
    });

    showMenu();
  }, [showMenu]);

  const onKeyPressLine = useCallback((index: number, e: any) => {
    const key = e.nativeEvent.key;
    if (key !== 'Backspace') return;

    setContent((prev) => {
      const safeContent = typeof prev === 'string' ? prev : '';
      const lines = safeContent.split('\n');
      const line = lines[index];
      
      // If line is empty or just a prefix, delete it
      if ((line === '' || line === BULLET_PREFIX || line === CHECKBOX_PREFIX || line === CHECKED_PREFIX) && lines.length > 0) {
        
        // Prevent keyboard dismissal by focusing previous element BEFORE render update
        if (index > 0) {
           inputRefs.current[index - 1]?.focus();
           
           // Ensure we scroll to it if needed? 
           // Usually focus handles it, or auto-scroll logic handles it.
        } else {
           // If index is 0, focus title
           titleInputRef.current?.focus();
        }

        // Now remove the line
        // Special case: if it is the only line, we might just clear it?
        // Code below requires lines.length > 2 to delete?
        // Original code: && lines.length > 2. 
        // This prevented deleting the last remaining line?
        // If I have 1 line, I can't delete it?
        // If I have 2 lines, I can delete one.
        if (lines.length > 1) {
            lines.splice(index, 1);
            return lines.join('\n');
        } else if (lines.length === 1) {
            // If only 1 line, just clear it?
            // User did not ask for this but "deleting lines".
            // If I delete the last line, I might want an empty line or just title?
            // Let's stick to creating empty line if it's the last one.
            return '';
        }
      }
      return prev;
    });
  }, []);

  const onFocusLine = useCallback((index: number) => {
    setFocusedIndex(index);
    showMenu();
    scrollToIndex(index);
  }, [showMenu, scrollToIndex]);

  const onToggleCheckbox = useCallback((index: number) => {
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

      if (isViewModeRef.current && noteId) {
        notesManager.updateNote(noteId, titleRef.current || '', finalVal);
      }
      return finalVal;
    });
    showMenu();
  }, [noteId, showMenu]);

  const onLayoutLine = useCallback((index: number, y: number) => {
    lineYPositions.current[index] = y;
  }, []);

  const setInputRef = useCallback((index: number, el: any) => {
    inputRefs.current[index] = el;
  }, []);

  const toggleLineStyle = useCallback((type: 'bullet' | 'checkbox') => {
    setContent((prev) => {
      const safeContent = typeof prev === 'string' ? prev : '';
      const lines = safeContent.split('\n');
      const fi = focusedIndex; // capture at call time
      const line = lines[fi] || '';
      const info = getLineInfo(line);

      if (type === 'bullet') {
        lines[fi] = info.type === 'bullet' ? info.text : BULLET_PREFIX + info.text;
      } else {
        lines[fi] = info.type === 'checkbox' ? info.text : CHECKBOX_PREFIX + info.text;
      }
      return lines.join('\n');
    });
    showMenu();
  }, [focusedIndex, showMenu]);

  // ─── Derived Data ────────────────────────────────────────────────
  const lines = useMemo(() => {
    return (typeof content === 'string' ? content : '').split('\n');
  }, [content]);

  const focusedLineInfo = useMemo(() => {
    return getLineInfo(lines[focusedIndex] || '');
  }, [lines, focusedIndex]);

  const bottomPadding = useMemo(() => {
    return keyboardHeight > 0 ? keyboardHeight + 120 : 150;
  }, [keyboardHeight]);

  // ─── Render ────────────────────────────────────────────────────────
  if (!note) return <View style={styles.container} />;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <DoodleBackground />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={flexOne}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.mainLayout}>
          <ScrollView
            ref={scrollViewRef}
            style={styles.content}
            contentContainerStyle={{ paddingBottom: bottomPadding }}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
            onScroll={showMenu}
            scrollEventThrottle={100}
          >
            <View style={styles.titleSection}>
              <RNTextInput
                ref={titleInputRef}
                placeholder="Title"
                value={title || ''}
                onChangeText={setTitle}
                editable={!isViewMode}
                style={[styles.titleInput, { color: theme.colors.onBackground }]}
                placeholderTextColor={theme.colors.onSurfaceVariant}
              />
            </View>

            <View style={styles.editorContentWrapper}>
              {lines.map((line, index) => (
                <LineRow
                  key={index}
                  line={line}
                  index={index}
                  isViewMode={isViewMode}
                  primaryColor={theme.colors.primary}
                  onSurfaceColor={theme.colors.onSurface}
                  onSurfaceVariantColor={theme.colors.onSurfaceVariant}
                  onUpdateLine={onUpdateLine}
                  onFocusLine={onFocusLine}
                  onKeyPress={onKeyPressLine}
                  onToggleCheckbox={onToggleCheckbox}
                  onLayoutLine={onLayoutLine}
                  inputRef={setInputRef}
                />
              ))}
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

        <Dialog visible={unsavedDialogVisible} onDismiss={() => setUnsavedDialogVisible(false)}>
          <Dialog.Title>Unsaved Changes</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">You have unsaved changes. Do you want to save them before leaving?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setUnsavedDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleUnsavedDiscard} textColor={theme.colors.error}>Discard</Button>
            <Button onPress={handleUnsavedSave}>Save & Exit</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={duplicateConfirmVisible} onDismiss={() => setDuplicateConfirmVisible(false)}>
          <Dialog.Title>Duplicate Note</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">Are you sure you want to duplicate this note?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDuplicateConfirmVisible(false)}>Cancel</Button>
            <Button onPress={onConfirmDuplicate}>Duplicate</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        action={{
          label: 'Close',
          onPress: () => setSnackbarVisible(false),
        }}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
};

// ─── Static styles & constants ──────────────────────────────────────────
const flexOne = { flex: 1 };
const headerRightStyle = { flexDirection: 'row' as const, alignItems: 'center' as const };
const saveLabelStyle = { fontWeight: 'bold' as const };

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
  noStrikethrough: {
    textDecorationLine: 'none',
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
  charCountSmall: { fontSize: 8, opacity: 0.5, fontWeight: 'bold' },
});

export default NoteDetailScreen;
