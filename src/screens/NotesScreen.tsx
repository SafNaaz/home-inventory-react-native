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
} from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';

import { notesManager } from '../managers/NotesManager';
import { Note } from '../models/Types';
import DoodleBackground from '../components/DoodleBackground';
import { tabBar as tabBarDims, rs, fontSize as fs, spacing as sp, radius as r, screen } from '../themes/Responsive';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2; // 2 columns with padding

const NotesScreen: React.FC = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  
  const dynamicPadding = tabBarDims.height + (insets.bottom > 0 ? insets.bottom + rs(8) : tabBarDims.bottomOffset) + rs(20);
  const [notes, setNotes] = useState<Note[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  const [limitAlertVisible, setLimitAlertVisible] = useState(false);

  useEffect(() => {
    loadNotesData();
  }, [isFocused]); // Reload when screen comes into focus

  useEffect(() => {
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
      // Navigate to detail screen in edit mode, marked as new
      navigation.navigate('NoteDetail', { 
        noteId: newNote.id, 
        isNew: true,
        initialViewMode: false 
      });
    } else {
      setLimitAlertVisible(true);
    }
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
      <Card 
        key={note.id} 
        style={[styles.noteCard, { width: cardWidth }]}
        onPress={() => navigation.navigate('NoteDetail', { 
          noteId: note.id,
          initialViewMode: true 
        })}
      >
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
              onPress={() => navigation.navigate('NoteDetail', { 
                noteId: note.id,
                initialViewMode: false 
              })}
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

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollView: {
      flex: 1,
    },
    notesGrid: {
      padding: sp.base,
    },
    noteRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: sp.base,
    },
    noteCard: {
      minHeight: screen.isSmall ? 120 : 140,
      backgroundColor: theme.colors.surface,
      borderRadius: r.lg,
      elevation: 2,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    cardContent: {
      flex: 1,
      padding: sp.md,
    },
    noteHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: sp.sm,
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
      fontSize: fs.xs,
      fontWeight: 'bold',
    },
    dateText: {
      fontSize: fs.xs,
      color: theme.colors.onSurfaceVariant,
    },
    noteTitle: {
      fontSize: fs.base,
      fontWeight: '600',
      marginBottom: 6,
      lineHeight: 20,
      color: theme.colors.onSurface,
    },
    noteContent: {
      fontSize: fs.sm,
      color: theme.colors.onSurfaceVariant,
      lineHeight: 18,
      marginBottom: 6,
    },
    noContent: {
      fontSize: fs.sm,
      color: theme.colors.onSurfaceVariant,
      fontStyle: 'italic',
      marginBottom: 6,
    },
    spacer: {
      flex: 1,
    },
    actionButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 6,
    },
    editButtonText: {
      fontSize: fs.xs,
      color: theme.colors.primary,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: screen.isSmall ? 28 : 40,
      minHeight: 400,
    },
    emptyTitle: {
      fontSize: screen.isSmall ? fs.xxl : fs.h2,
      fontWeight: 'bold',
      marginTop: 24,
      marginBottom: sp.base,
      textAlign: 'center',
      color: theme.colors.onBackground,
    },
    emptyText: {
      fontSize: fs.base,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 24,
      paddingHorizontal: 16,
    },
    addFirstNoteButton: {
      paddingHorizontal: sp.xl,
    },
    fab: {
      position: 'absolute',
      margin: screen.isSmall ? 12 : 16,
      right: 0,
      bottom: tabBarDims.height + tabBarDims.bottomOffset + 10,
      backgroundColor: theme.colors.primary,
    },
  });

  return (
    <View style={styles.container}>
      <DoodleBackground />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: dynamicPadding }}
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
          style={[
            styles.fab, 
            { 
              backgroundColor: theme.colors.primary,
              bottom: (insets.bottom > 0 ? insets.bottom + rs(8) : tabBarDims.bottomOffset) + tabBarDims.height + rs(24)
            }
          ]}
          color={theme.colors.onPrimary}
          onPress={handleAddNote}
        />
      )}

      {renderLimitAlertDialog()}
      {renderDeleteConfirmDialog()}
    </View>
  );
};

export default NotesScreen;