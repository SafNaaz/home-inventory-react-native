import { Note } from '../models/Types';
import { StorageService } from '../services/StorageService';

// Simple UUID generator for React Native
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// MARK: - Notes Manager Class
export class NotesManager {
  private notes: Note[] = [];
  private listeners: Set<() => void> = new Set();
  private readonly maxNotes = 6;

  constructor() {
    this.loadNotes();
  }

  // MARK: - Event Listeners
  addListener(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    this.listeners.forEach(callback => callback());
  }

  // MARK: - Data Loading
  private async loadNotes(): Promise<void> {
    try {
      this.notes = await StorageService.loadNotes();
      console.log(`📝 Loaded ${this.notes.length} notes from storage`);
      this.notifyListeners();
    } catch (error) {
      console.error('❌ Error loading notes:', error);
    }
  }

  private async saveNotes(): Promise<void> {
    try {
      await StorageService.saveNotes(this.notes);
      this.notifyListeners();
    } catch (error) {
      console.error('❌ Error saving notes:', error);
    }
  }

  // MARK: - Notes Management
  getNotes(): Note[] {
    return [...this.notes];
  }

  getNote(id: string): Note | undefined {
    return this.notes.find(note => note.id === id);
  }

  canAddNote(): boolean {
    return this.notes.length < this.maxNotes;
  }

  getMaxNotes(): number {
    return this.maxNotes;
  }

  async addNote(title: string = '', content: string = ''): Promise<Note | null> {
    if (!this.canAddNote()) {
      console.log(`⚠️ Cannot add note - maximum of ${this.maxNotes} notes reached`);
      return null;
    }

    const newNote: Note = {
      id: generateUUID(),
      title: title.trim(),
      content: content.trim(),
      createdDate: new Date(),
      lastModified: new Date(),
    };

    // Add to beginning of array (most recent first)
    this.notes.unshift(newNote);
    await this.saveNotes();

    console.log(`✅ Added new note: ${newNote.title || 'Untitled'}`);
    return newNote;
  }

  async updateNote(id: string, title: string, content: string): Promise<boolean> {
    const note = this.notes.find(n => n.id === id);
    if (!note) {
      console.error(`❌ Note not found: ${id}`);
      return false;
    }

    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    // Only update if there's actually a change
    if (note.title !== trimmedTitle || note.content !== trimmedContent) {
      note.title = trimmedTitle;
      note.content = trimmedContent;
      note.lastModified = new Date();

      await this.saveNotes();
      console.log(`✏️ Updated note: ${note.title || 'Untitled'}`);
    }

    return true;
  }

  async deleteNote(id: string): Promise<boolean> {
    const noteIndex = this.notes.findIndex(note => note.id === id);
    if (noteIndex === -1) {
      console.error(`❌ Note not found: ${id}`);
      return false;
    }

    const note = this.notes[noteIndex];
    this.notes.splice(noteIndex, 1);
    await this.saveNotes();

    console.log(`🗑️ Deleted note: ${note.title || 'Untitled'}`);
    return true;
  }

  async duplicateNote(id: string): Promise<Note | null> {
    if (!this.canAddNote()) {
      console.log(`⚠️ Cannot duplicate note - maximum of ${this.maxNotes} notes reached`);
      return null;
    }

    const originalNote = this.notes.find(note => note.id === id);
    if (!originalNote) {
      console.error(`❌ Note not found: ${id}`);
      return null;
    }

    const duplicatedNote: Note = {
      id: generateUUID(),
      title: `${originalNote.title} (Copy)`,
      content: originalNote.content,
      createdDate: new Date(),
      lastModified: new Date(),
    };

    // Add after the original note
    const originalIndex = this.notes.findIndex(note => note.id === id);
    this.notes.splice(originalIndex + 1, 0, duplicatedNote);
    await this.saveNotes();

    console.log(`📋 Duplicated note: ${originalNote.title || 'Untitled'}`);
    return duplicatedNote;
  }

  // MARK: - Search and Filter
  searchNotes(query: string): Note[] {
    if (!query.trim()) {
      return [...this.notes];
    }

    const searchTerm = query.toLowerCase().trim();
    return this.notes.filter(note => 
      note.title.toLowerCase().includes(searchTerm) ||
      note.content.toLowerCase().includes(searchTerm)
    );
  }

  getRecentNotes(limit: number = 3): Note[] {
    return this.notes
      .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
      .slice(0, limit);
  }

  getNotesCreatedToday(): Note[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return this.notes.filter(note => {
      const noteDate = new Date(note.createdDate);
      noteDate.setHours(0, 0, 0, 0);
      return noteDate.getTime() === today.getTime();
    });
  }

  getNotesModifiedToday(): Note[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return this.notes.filter(note => {
      const modifiedDate = new Date(note.lastModified);
      modifiedDate.setHours(0, 0, 0, 0);
      return modifiedDate.getTime() === today.getTime();
    });
  }

  // MARK: - Statistics
  getTotalNotes(): number {
    return this.notes.length;
  }

  getTotalCharacters(): number {
    return this.notes.reduce((total, note) => total + note.title.length + note.content.length, 0);
  }

  getAverageNoteLength(): number {
    if (this.notes.length === 0) return 0;
    return Math.round(this.getTotalCharacters() / this.notes.length);
  }

  getLongestNote(): Note | null {
    if (this.notes.length === 0) return null;
    
    return this.notes.reduce((longest, current) => {
      const currentLength = current.title.length + current.content.length;
      const longestLength = longest.title.length + longest.content.length;
      return currentLength > longestLength ? current : longest;
    });
  }

  getMostRecentlyModified(): Note | null {
    if (this.notes.length === 0) return null;
    
    return this.notes.reduce((mostRecent, current) => 
      current.lastModified > mostRecent.lastModified ? current : mostRecent
    );
  }

  // MARK: - Import/Export
  exportNotesToJSON(): string {
    const exportData = {
      exportDate: new Date().toISOString(),
      totalNotes: this.notes.length,
      notes: this.notes.map(note => ({
        id: note.id,
        title: note.title,
        content: note.content,
        createdDate: note.createdDate.toISOString(),
        lastModified: note.lastModified.toISOString(),
      })),
    };

    return JSON.stringify(exportData, null, 2);
  }

  async importNotesFromJSON(jsonData: string): Promise<{ success: boolean; imported: number; errors: string[] }> {
    const result = { success: false, imported: 0, errors: [] as string[] };

    try {
      const data = JSON.parse(jsonData);
      
      if (!data.notes || !Array.isArray(data.notes)) {
        result.errors.push('Invalid JSON format: notes array not found');
        return result;
      }

      for (const noteData of data.notes) {
        if (this.notes.length >= this.maxNotes) {
          result.errors.push('Maximum number of notes reached');
          break;
        }

        try {
          const note: Note = {
            id: generateUUID(), // Generate new ID to avoid conflicts
            title: noteData.title || '',
            content: noteData.content || '',
            createdDate: new Date(noteData.createdDate || Date.now()),
            lastModified: new Date(noteData.lastModified || Date.now()),
          };

          this.notes.unshift(note);
          result.imported++;
        } catch (error) {
          result.errors.push(`Error importing note: ${error}`);
        }
      }

      if (result.imported > 0) {
        await this.saveNotes();
        result.success = true;
        console.log(`📥 Imported ${result.imported} notes`);
      }

    } catch (error) {
      result.errors.push(`JSON parsing error: ${error}`);
    }

    return result;
  }

  // MARK: - Data Management
  async clearAllNotes(): Promise<void> {
    this.notes = [];
    await this.saveNotes();
    console.log('🗑️ All notes cleared');
  }

  async resetToDefaults(): Promise<void> {
    await this.clearAllNotes();
    console.log('🔄 Notes reset to defaults');
  }
}

// Export singleton instance
export const notesManager = new NotesManager();