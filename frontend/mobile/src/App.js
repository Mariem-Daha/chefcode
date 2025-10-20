import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform 
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';

// Import ChefCode API (path relativo corretto)
const ChefCodeAPI = require('../../shared/api.js');
const { storage, parser, validator, formatter, device } = require('../../shared/utils.js');

export default function App() {
  const [inventory, setInventory] = useState([]);
  const [recipes, setRecipes] = useState({});
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatResponse, setChatResponse] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [serverConnected, setServerConnected] = useState(false);
  
  // FastAPI Backend Connection (port 8000)
  const [serverIP, setServerIP] = useState('192.168.1.100');
  const api = new ChefCodeAPI(`http://${serverIP}:8000`);
  
  // Configure API authentication
  // NOTE: For development only. In production, use secure storage (e.g., Expo SecureStore)
  api.setApiKey('PlXSE6GX_uGzsfQjpnkiXHWc7PNX-uZ6gGMWojabSfM');
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setRefreshing(true);
    
    try {
      // Load from local storage first (offline-first approach)
      const savedData = await storage.load();
      if (savedData) {
        setInventory(savedData.inventory || []);
        setRecipes(savedData.recipes || {});
        setTasks(savedData.tasks || []);
        console.log('📱 Data loaded from local storage');
      }
      
      // Try to connect to FastAPI backend (port 8000)
      console.log(`🔍 Connecting to FastAPI: ${serverIP}:8000`);
      const serverAvailable = await api.ping();
      setServerConnected(serverAvailable);
      
      if (serverAvailable) {
        console.log('✅ FastAPI connected - syncing...');
        const serverInventory = await api.getInventory();
        const serverRecipes = await api.getRecipes();
        const serverTasks = await api.getTasks();
        
        setInventory(serverInventory);
        setRecipes(serverRecipes);
        setTasks(serverTasks);
        
        await storage.save({
          inventory: serverInventory,
          recipes: serverRecipes,
          tasks: serverTasks
        });
        
        console.log('🔄 Synced with backend');
      } else {
        console.log('⚠️ Backend offline - using local data');
      }
      
    } catch (error) {
      console.error('❌ Errore caricamento:', error);
      setServerConnected(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const sendChatMessage = async () => {
    if (!chatMessage.trim()) return;
    
    if (!serverConnected) {
      setChatResponse('⚠️ Backend offline. Start FastAPI on port 8000.');
      setTimeout(() => setChatResponse(''), 3000);
      return;
    }
    
    setLoading(true);
    try {
      const response = await api.sendChatMessage(chatMessage);
      
      if (response.status === 'success' && response.parsed_data) {
        const parsed = response.parsed_data;
        const newItem = {
          name: parsed.item_name,
          quantity: parsed.quantity,
          unit: parsed.unit,
          price: parsed.unit_price,
          category: parsed.type || 'Other'
        };
        
        const newInventory = [...inventory, newItem];
        setInventory(newInventory);
        await storage.save({ inventory: newInventory, recipes, tasks });
        
        setChatResponse(response.message || `✅ Added ${parsed.item_name}`);
      } else {
        setChatResponse(response.message || 'Response received');
      }
    } catch (error) {
      setChatResponse('❌ Error: ' + error.message);
    } finally {
      setLoading(false);
      setChatMessage('');
      setTimeout(() => setChatResponse(''), 5000);
    }
  };
  
  // Voice Recognition
  const startVoiceRecording = async () => {
    try {
      setIsRecording(true);
      
      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permesso richiesto', 'ChefCode ha bisogno del microfono per i comandi vocali');
        setIsRecording(false);
        return;
      }
      
      // Simula riconoscimento vocale (per demo)
      // In produzione useresti expo-speech-recognition o libreria simile
      setTimeout(() => {
        const demoCommands = [
          'aggiungi 2 kg pasta 3 euro',
          'aggiungi 500 grammi pomodori 2 euro e 50',
          'aggiungi 1 litro latte 4 euro'
        ];
        const randomCommand = demoCommands[Math.floor(Math.random() * demoCommands.length)];
        setChatMessage(randomCommand);
        setIsRecording(false);
        
        Speech.speak('Comando riconosciuto: ' + randomCommand, { language: 'it-IT' });
      }, 2000);
      
    } catch (error) {
      console.error('Errore riconoscimento vocale:', error);
      setIsRecording(false);
      Alert.alert('Errore', 'Problema con riconoscimento vocale: ' + error.message);
    }
  };

  const addInventoryItem = async () => {
    Alert.prompt(
      'Aggiungi Ingrediente',
      'Usa comandi come: "2 kg pasta 3€"',
      async (text) => {
        if (!text) return;
        
        const parsed = parser.parseItalianCommand('aggiungi ' + text);
        const validation = validator.validateIngredient(parsed);
        
        if (!validation.isValid) {
          Alert.alert('Errore', validation.errors.join('\n'));
          return;
        }
        
        const newItem = {
          name: parsed.name,
          quantity: parsed.quantity,
          unit: parsed.unit,
          price: parsed.price,
          category: 'Aggiunto da mobile'
        };
        
        const newInventory = [...inventory, newItem];
        setInventory(newInventory);
        
        // Save locally and sync with backend
        await storage.save({ 
          inventory: newInventory, 
          recipes, 
          tasks 
        });
        
        // Sync with backend if connected
        if (serverConnected) {
          try {
            await api.addInventoryItem(newItem);
            console.log('✅ Item synced with backend');
          } catch (error) {
            console.log('⚠️ Backend sync failed:', error.message);
          }
        }
        
        Alert.alert('Success', `${parsed.name} added to inventory!`);
      }
    );
  };
  
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar style="auto" />
        
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>🍳 ChefCode Mobile</Text>
            <Text style={styles.subtitle}>
              {serverConnected ? '🟢 FastAPI Connected (Port 8000)' : '🔴 Offline Mode'}
            </Text>
          </View>
          <TouchableOpacity 
            style={[styles.reloadButton, { opacity: loading ? 0.5 : 1 }]} 
            onPress={() => loadData(true)}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.buttonText}>🔄</Text>
            )}
          </TouchableOpacity>
        </View>
        
        <ScrollView 
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadData(false)} />
          }
        >
          {/* Chat AI Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🤖 Chat AI</Text>
            <View style={styles.chatContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="Scrivi un comando... (es: aggiungi 2 kg pasta)"
                value={chatMessage}
                onChangeText={setChatMessage}
                multiline
              />
              <TouchableOpacity 
                style={[styles.voiceButton, { backgroundColor: isRecording ? '#e74c3c' : '#9b59b6' }]} 
                onPress={startVoiceRecording}
                disabled={isRecording}
              >
                <Text style={styles.buttonText}>
                  {isRecording ? '🎙️' : '🎤'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.sendButton, { opacity: (loading || !chatMessage.trim()) ? 0.5 : 1 }]} 
                onPress={sendChatMessage}
                disabled={loading || !chatMessage.trim()}
              >
                <Text style={styles.buttonText}>✈️</Text>
              </TouchableOpacity>
            </View>
            {chatResponse ? (
              <View style={styles.responseContainer}>
                <Text style={styles.responseText}>{chatResponse}</Text>
              </View>
            ) : null}
          </View>
          
          {/* Inventory Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>📦 Inventario ({inventory.length})</Text>
              <TouchableOpacity style={styles.addButton} onPress={addInventoryItem}>
                <Text style={styles.buttonText}>+ Aggiungi</Text>
              </TouchableOpacity>
            </View>
            
            {inventory.map((item, index) => (
              <View key={index} style={styles.inventoryItem}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemDetails}>
                  {formatter.quantity(item.quantity, item.unit)} • {formatter.currency(item.price)}
                </Text>
                <Text style={styles.itemCategory}>{item.category}</Text>
              </View>
            ))}
            
            {inventory.length === 0 && (
              <Text style={styles.emptyText}>Nessun ingrediente nell'inventario</Text>
            )}
          </View>
          
          {/* Recipes Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📝 Ricette ({Object.keys(recipes).length})</Text>
            {Object.keys(recipes).map((recipeName) => (
              <View key={recipeName} style={styles.recipeItem}>
                <Text style={styles.recipeName}>{recipeName}</Text>
                <Text style={styles.recipeIngredients}>
                  {recipes[recipeName].items?.length || 0} ingredienti
                </Text>
              </View>
            ))}
            
            {Object.keys(recipes).length === 0 && (
              <Text style={styles.emptyText}>Nessuna ricetta configurata</Text>
            )}
          </View>
        </ScrollView>
        
        {loading && (
          <View style={styles.loadingOverlay}>
            <Text style={styles.loadingText}>Caricamento...</Text>
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#2c3e50',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 12,
    color: '#ecf0f1',
    marginTop: 2,
  },
  reloadButton: {
    backgroundColor: '#3498db',
    padding: 8,
    borderRadius: 8,
    minWidth: 36,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  chatContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
    maxHeight: 100,
  },
  voiceButton: {
    backgroundColor: '#9b59b6',
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
    minWidth: 45,
    alignItems: 'center',
  },
  sendButton: {
    backgroundColor: '#3498db',
    padding: 12,
    borderRadius: 8,
    minWidth: 45,
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: '#27ae60',
    padding: 8,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  responseContainer: {
    backgroundColor: '#ecf0f1',
    padding: 12,
    borderRadius: 8,
  },
  responseText: {
    color: '#2c3e50',
  },
  inventoryItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  itemDetails: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 4,
  },
  itemCategory: {
    fontSize: 12,
    color: '#95a5a6',
    marginTop: 2,
  },
  recipeItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 12,
  },
  recipeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  recipeIngredients: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: '#95a5a6',
    fontStyle: 'italic',
    marginTop: 20,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
  },
});