import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Dimensions,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  FAB,
  IconButton,
  Text,
  useTheme,
  Portal,
  Dialog,
  TextInput,
} from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

import { notesManager } from '../managers/NotesManager';
import { Note } from '../models/Types';
import { commonStyles } from '../themes/AppTheme';
import DoodleBackground from '../components/DoodleBackground';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2; // 2 columns with padding

const NotesScreen: React.FC = () => {
  const theme = useTheme();
  const [notes, setNotes] = useState<Note[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [editDialogVisible, setEditDialogVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  const [limitAlertVisible, setLimitAlertVisible] = useState(false);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollView: {
      flex: 1,
    },
    notesGrid: {
      padding: 16,
    },
    noteRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    noteCard: {
      minHeight: 140,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      elevation: 2,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    cardContent: {
      flex: 1,
      padding: 16,
    },
    noteHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    numberBadge: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    numberText: {
      color: theme.colors.onPrimary,
      fontSize: 10,
      fontWeight: 'bold',
    },
    dateText: {
      fontSize: 10,
      color: theme.colors.onSurfaceVariant,
    },
    noteTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 8,
      lineHeight: 20,
      color: theme.colors.onSurface,
    },
    noteContent: {
      fontSize: 14,
      color: theme.colors.onSurfaceVariant,
      lineHeight: 18,
      marginBottom: 8,
    },
    noContent: {
      fontSize: 14,
      color: theme.colors.onSurfaceVariant,
      fontStyle: 'italic',
      marginBottom: 8,
    },
    spacer: {
      flex: 1,
    },
    actionButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 8,
    },
    editButtonText: {
      fontSize: 12,
      color: theme.colors.primary,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
      minHeight: 400,
    },
    emptyTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      marginTop: 30,
      marginBottom: 16,
      textAlign: 'center',
      color: theme.colors.onBackground,
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: 30,
      paddingHorizontal: 20,
    },
    addFirstNoteButton: {
      paddingHorizontal: 20,
    },
    fab: {
      position: 'absolute',
      margin: 16,
      right: 0,
      bottom: 120,
      backgroundColor: theme.colors.primary,
    },
    fullScreenDialog: {
      margin: 0,
      flex: 1,
      backgroundColor: theme.colors.surface,
    },
    dialogHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outline,
      backgroundColor: theme.colors.surface,
    },
    dialogTitle: {
      fontSize: 16,
      fontWeight: '600',
      flex: 1,
      textAlign: 'center',
      color: theme.colors.onSurface,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerButtonText: {
      fontSize: 16,
      color: theme.colors.primary,
    },
    saveButtonText: {
      fontWeight: '600',
    },
    titleSection: {
      backgroundColor: theme.colors.surfaceVariant,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    titleInput: {
      backgroundColor: 'transparent',
      fontSize: 20,
      fontWeight: '600',
    },
    titleInputContent: {
      paddingHorizontal: 0,
      paddingVertical: 12,
    },
    contentSection: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 16,
      paddingTop: 16,
    },
    contentInput: {
      flex: 1,
      backgroundColor: 'transparent',
      fontSize: 16,
      textAlignVertical: 'top',
    },
    contentInputContent: {
      paddingHorizontal: 0,
      paddingVertical: 0,
      minHeight: 200,
    },
  });

  useEffect(() => {
    // Load initial data
    loadNotesData();

    // Set up listener for data changes
    const unsubscribe = notesManager.addListener(() => {
      loadNotesData();
    });

    return unsubscribe;
  }, []);

  const loadNotesData = () => {
    const allNotes = notesManager.getNotes();
    setNotes(allNotes);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    loadNotesData();
    setRefreshing(false);
  };

  const handleAddNote = async () => {
    const newNote = await notesManager.addNote();
    if (newNote) {
      openEditDialog(newNote);
    } else {
      setLimitAlertVisible(true);
    }
  };

  const openEditDialog = (note: Note) => {
    setEditingNote(note);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditDialogVisible(true);
  };

  const handleSaveNote = async () => {
    if (!editingNote) return;

    await notesManager.updateNote(editingNote.id, editTitle, editContent);
    setEditDialogVisible(false);
    setEditingNote(null);
    setEditTitle('');
    setEditContent('');
  };

  const handleDeleteNote = (note: Note) => {
    setNoteToDelete(note);
    setDeleteConfirmVisible(true);
  };

  const onConfirmDelete = async () => {
    if (noteToDelete) {
      await notesManager.deleteNote(noteToDelete.id);
      setDeleteConfirmVisible(false);
      setNoteToDelete(null);
    }
  };

  const formatDate = (date: Date): string => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const noteDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (noteDate.getTime() === today.getTime()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const renderNoteCard = (note: Note, index: number) => {
    const displayTitle = note.title.trim() || 'Untitled Note';
    const hasContent = note.content.trim().length > 0;

    return (
      <Card key={note.id} style={[styles.noteCard, { width: cardWidth }]}>
        <Card.Content style={styles.cardContent}>
          {/* Header with number and date */}
          <View style={styles.noteHeader}>
            <View style={styles.numberBadge}>
              <Text style={styles.numberText}>{index + 1}</Text>
            </View>
            <Text style={styles.dateText}>
              {formatDate(note.lastModified)}
            </Text>
          </View>

          {/* Title */}
          <Title style={styles.noteTitle} numberOfLines={2}>
            {displayTitle}
          </Title>

          {/* Content preview */}
          {hasContent ? (
            <Paragraph style={styles.noteContent} numberOfLines={2}>
              {note.content}
            </Paragraph>
          ) : (
            <Text style={styles.noContent}>No content</Text>
          )}

          <View style={styles.spacer} />

          {/* Action buttons */}
          <View style={styles.actionButtons}>
            <Button
              mode="text"
              onPress={() => openEditDialog(note)}
              compact
              icon="pencil"
              labelStyle={styles.editButtonText}
            >
              Edit
            </Button>
            <IconButton
              icon="delete"
              size={16}
              iconColor={theme.colors.error}
              onPress={() => handleDeleteNote(note)}
            />
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="note-text" size={80} color={theme.colors.onSurfaceVariant} />
      <Title style={styles.emptyTitle}>No Notes Yet</Title>
      <Paragraph style={styles.emptyText}>
        Tap the + button to create your first quick note. You can have up to {notesManager.getMaxNotes()} notes.
      </Paragraph>
      <Button
        mode="contained"
        onPress={handleAddNote}
        style={styles.addFirstNoteButton}
        icon="plus-circle"
      >
        Create First Note
      </Button>
    </View>
  );

  const renderEditDialog = () => (
    <Portal>
      <Dialog 
        visible={editDialogVisible} 
        onDismiss={() => setEditDialogVisible(false)}
        style={styles.fullScreenDialog}
      >
        {/* Navigation Header */}
        <View style={styles.dialogHeader}>
          <Button 
            onPress={() => setEditDialogVisible(false)}
            labelStyle={styles.headerButtonText}
          >
            Cancel
          </Button>
          <Text style={styles.dialogTitle}>Edit Note</Text>
          <View style={styles.headerRight}>
            {editingNote && (
              <IconButton
                icon="delete"
                size={20}
                iconColor={theme.colors.error}
                onPress={() => {
                  handleDeleteNote(editingNote);
                  setEditDialogVisible(false);
                }}
              />
            )}
            <Button 
              onPress={handleSaveNote}
              labelStyle={[styles.headerButtonText, styles.saveButtonText]}
            >
              Save
            </Button>
          </View>
        </View>

        {/* Title Field */}
        <View style={styles.titleSection}>
          <TextInput
            placeholder="Enter note title..."
            value={editTitle}
            onChangeText={setEditTitle}
            mode="flat"
            style={styles.titleInput}
            contentStyle={styles.titleInputContent}
            underlineStyle={{ display: 'none' }}
          />
        </View>

        {/* Content Field */}
        <View style={styles.contentSection}>
          <TextInput
            placeholder="Start writing your note..."
            value={editContent}
            onChangeText={setEditContent}
            mode="flat"
            multiline
            style={styles.contentInput}
            contentStyle={styles.contentInputContent}
            underlineStyle={{ display: 'none' }}
          />
        </View>
      </Dialog>
    </Portal>
  );

  const renderLimitAlertDialog = () => (
    <Portal>
      <Dialog visible={limitAlertVisible} onDismiss={() => setLimitAlertVisible(false)}>
        <Dialog.Title>Note Limit Reached</Dialog.Title>
        <Dialog.Content>
          <Text style={{ color: theme.colors.onSurface }}>You can only have up to {notesManager.getMaxNotes()} notes. Please delete one and try again.</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setLimitAlertVisible(false)}>OK</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );

  const renderDeleteConfirmDialog = () => (
    <Portal>
      <Dialog visible={deleteConfirmVisible} onDismiss={() => setDeleteConfirmVisible(false)}>
        <Dialog.Title>Delete Note</Dialog.Title>
        <Dialog.Content>
          <Text style={{ color: theme.colors.onSurface }}>Are you sure you want to delete this note?</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setDeleteConfirmVisible(false)}>Cancel</Button>
          <Button onPress={onConfirmDelete} textColor={theme.colors.error}>Delete</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );

  const renderNotesGrid = () => {
    const rows = [];
    for (let i = 0; i < notes.length; i += 2) {
      const rowNotes = notes.slice(i, i + 2);
      rows.push(
        <View key={i} style={styles.noteRow}>
          {rowNotes.map((note, index) => renderNoteCard(note, i + index))}
          {rowNotes.length === 1 && <View style={{ width: cardWidth }} />}
        </View>
      );
    }
    return rows;
  };

  const canAddNote = notesManager.canAddNote();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <DoodleBackground />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {notes.length > 0 ? (
          <View style={styles.notesGrid}>
            {renderNotesGrid()}
          </View>
        ) : (
          renderEmptyState()
        )}
      </ScrollView>

      {canAddNote && (
        <FAB
          icon="plus"
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          color={theme.dark ? '#000' : '#fff'}
          onPress={handleAddNote}
        />
      )}

      {renderEditDialog()}
      {renderLimitAlertDialog()}
      {renderDeleteConfirmDialog()}
    </View>
  );
};

export default NotesScreen;