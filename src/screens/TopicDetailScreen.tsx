import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useStore } from '../store/useStore';
import { supabaseService } from '../services/supabaseService';
import { Button } from '../components/Button';
import { FileText } from 'lucide-react-native';

export const TopicDetailScreen = () => {
  const route = useRoute<any>();
  const { topicId } = route.params;
  const { topics, updateTopicStatus } = useStore();
  const topic = topics.find(t => t.id === topicId);
  
  const [noteContent, setNoteContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadNote();
  }, [topicId]);

  const loadNote = async () => {
    try {
      const note = await supabaseService.getNoteByTopicId(topicId);
      if (note) setNoteContent(note.content);
    } catch (error) {
      console.error('Error loading note:', error);
    }
  };

  const handleSaveNote = async () => {
    setIsSaving(true);
    try {
      await supabaseService.saveNote(topicId, noteContent);
    } catch (error) {
      console.error('Error saving note:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!topic) return null;

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{topic.title}</Text>
        
        {/* PDF Placeholder */}
        <View style={styles.pdfCard}>
          <FileText size={48} color="#4F46E5" />
          <Text style={styles.pdfText}>Material de estudio (PDF)</Text>
          <Button 
            title="Abrir PDF" 
            variant="outline" 
            onPress={() => console.log('Abrir PDF:', topic.pdf_url)} 
            style={styles.pdfButton}
          />
        </View>

        {/* Notes Section */}
        <View style={styles.notesSection}>
          <Text style={styles.sectionTitle}>Tus Notas</Text>
          <TextInput
            style={styles.noteInput}
            multiline
            placeholder="Escribe tus notas aquí..."
            value={noteContent}
            onChangeText={setNoteContent}
            onBlur={handleSaveNote}
          />
        </View>

        <Button 
          title={topic.status === 'mastered' ? "Tema Dominado" : "Marcar como Dominado"} 
          onPress={() => updateTopicStatus(topicId, 'mastered')}
          variant={topic.status === 'mastered' ? "secondary" : "primary"}
          disabled={topic.status === 'mastered'}
          style={styles.completeButton}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
  },
  pdfCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    marginBottom: 24,
  },
  pdfText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginTop: 12,
  },
  pdfButton: {
    marginTop: 16,
    width: '100%',
  },
  notesSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  noteInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    minHeight: 150,
    fontSize: 16,
    color: '#374151',
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  completeButton: {
    marginTop: 10,
  }
});
