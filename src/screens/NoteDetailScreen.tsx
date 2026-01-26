import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, StyleSheet, ScrollView, BackHandler, Alert } from 'react-native';
import { TextInput, useTheme, Button, IconButton, Text, Portal, Dialog } from 'react-native-paper';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { notesManager } from '../managers/NotesManager';
import { Note } from '../models/Types';
import DoodleBackground from '../components/DoodleBackground';

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

  useEffect(() => {
    loadNote();
  }, [noteId]);

  // Handle hardware back button
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        handleBack();
        return true;
      };

      BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, [isNew, isViewMode, note])
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: isViewMode ? 'View Note' : (isNew ? 'New Note' : 'Edit Note'),
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {!isViewMode && !isNew && (
            <IconButton
              icon="delete"
              iconColor={theme.colors.error}
              onPress={() => setDeleteConfirmVisible(true)}
            />
          )}
          {isViewMode ? (
            <IconButton
              icon="pencil"
              iconColor={theme.colors.primary}
              onPress={() => setIsViewMode(false)}
            />
          ) : (
            <Button 
              onPress={handleSave} 
              mode="text" 
              labelStyle={{ fontWeight: 'bold', fontSize: 16 }}
            >
              Save
            </Button>
          )}
        </View>
      ),
      // Custom back button handling
      headerLeft: () => (
        <IconButton
          icon={isViewMode ? "arrow-left" : "close"}
          iconColor={theme.colors.onSurface}
          onPress={handleBack}
        />
      ),
    });
  }, [navigation, isViewMode, isNew, theme, title, content]);

  const loadNote = () => {
    const loadedNote = notesManager.getNote(noteId);
    if (loadedNote) {
      setNote(loadedNote);
      setTitle(loadedNote.title);
      setContent(loadedNote.content);
    } else {
      // Note not found (maybe deleted), go back
      navigation.goBack();
    }
  };

  const handleSave = async () => {
    if (!noteId) return;

    await notesManager.updateNote(noteId, title, content);
    
    // If it was new, it's no longer new
    if (isNew) {
      // We can't easily change the route params, but we can behave as if it's saved
      // Navigate replace to avoid "isNew" loops if we stay on screen, 
      // but simpler is to just switch to view mode.
      navigation.setParams({ isNew: false });
    }
    
    setIsViewMode(true);
  };

  const handleBack = async () => {
    if (isNew) {
      // If cancelling a new note, delete it
      await notesManager.deleteNote(noteId);
      navigation.goBack();
    } else if (!isViewMode) {
      // If cancelling edit, revert changes and go to view mode
      if (note) {
        setTitle(note.title);
        setContent(note.content);
      }
      setIsViewMode(true);
    } else {
      // Just go back
      navigation.goBack();
    }
  };

  const handleDelete = async () => {
    await notesManager.deleteNote(noteId);
    navigation.goBack();
  };

  if (!note) return <View style={styles.container} />;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <DoodleBackground />
      <ScrollView style={styles.content}>
        <View style={styles.titleSection}>
          <TextInput
            placeholder="Enter note title..."
            value={title}
            onChangeText={setTitle}
            mode="flat"
            editable={!isViewMode}
            style={[styles.titleInput, { opacity: isViewMode ? 1 : 1, color: theme.colors.onBackground }]}
            contentStyle={styles.titleInputContent}
            underlineStyle={{ display: isViewMode ? 'none' : undefined }}
            placeholderTextColor={isViewMode ? theme.colors.onSurface : theme.colors.onSurfaceVariant}
          />
        </View>

        <View style={styles.contentSection}>
          <TextInput
            placeholder="Start writing your note..."
            value={content}
            onChangeText={setContent}
            mode="flat"
            multiline
            editable={!isViewMode}
            style={[styles.contentInput, { opacity: isViewMode ? 1 : 1, color: theme.colors.onBackground }]}
            contentStyle={styles.contentInputContent}
            underlineStyle={{ display: 'none' }}
            placeholderTextColor={isViewMode ? theme.colors.onSurfaceVariant : theme.colors.onSurfaceVariant}
          />
        </View>
      </ScrollView>

      <Portal>
        <Dialog visible={deleteConfirmVisible} onDismiss={() => setDeleteConfirmVisible(false)}>
          <Dialog.Title>Delete Note</Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: theme.colors.onSurface }}>Are you sure you want to delete this note?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteConfirmVisible(false)}>Cancel</Button>
            <Button onPress={handleDelete} textColor={theme.colors.error}>Delete</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  titleSection: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  titleInput: {
    backgroundColor: 'transparent',
    fontSize: 24,
    fontWeight: 'bold',
  },
  titleInputContent: {
    paddingHorizontal: 0,
    paddingVertical: 12,
  },
  contentSection: {
    flex: 1,
    paddingHorizontal: 16,
  },
  contentInput: {
    backgroundColor: 'transparent',
    fontSize: 16,
    lineHeight: 24,
    textAlignVertical: 'top',
  },
  contentInputContent: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    minHeight: 200,
  },
});

export default NoteDetailScreen;
