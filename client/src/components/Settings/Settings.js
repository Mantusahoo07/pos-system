import React, { useState, useEffect, useRef } from 'react';
import UserManagement from './UserManagement';
import NotificationSettings from '../Common/NotificationSettings';
import { 
  FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiGrid, FiList, FiSettings, 
  FiUsers, FiTag, FiPackage, FiPrinter, FiUser, FiLock, FiBell, FiMoon,
  FiUpload, FiDownload, FiDatabase, FiRefreshCw, FiCheckCircle, FiAlertCircle,
  FiArchive, FiHardDrive, FiFileText, FiFolder, FiDownloadCloud, FiFile,
  FiTable, FiSmartphone, FiCreditCard, FiHome, FiPhone, FiMail, FiMapPin,
  FiInfo, FiImage, FiToggleLeft, FiToggleRight, FiMessageCircle, FiArrowUp, FiArrowDown,
  FiLoader
} from 'react-icons/fi';
// import toast from 'react-hot-toast'; // REMOVED - Toast notifications disabled
import printerService from '../../services/printerService';
import notificationService from '../../services/notificationService';

// Theme Colors
const COLORS = {
  primary: '#573CFA',
  primaryLight: '#7B64FB',
  primaryDark: '#3D26D6',
  secondary: '#FB8D1A',
  secondaryLight: '#FCA44D',
  secondaryDark: '#E0780F',
  danger: '#E8083E',
  dangerLight: '#FF2B5C',
  dangerDark: '#C40634',
  success: '#02864A',
  successLight: '#03A85C',
  successDark: '#016E3D',
  neutral: '#1C1A27',
  neutralLight: '#2D2A3F',
  neutralDark: '#12111A',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0B8',
  textMuted: '#6B6B80',
  border: '#2D2A3F',
  bgCard: '#1E1C2D',
  bgHover: '#2D2A3F'
};

function Settings({ menu: initialMenu, categories: initialCategories, user, onSettingsUpdate }) {
  const [activeTab, setActiveTab] = useState('business');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const importFileInputRef = useRef(null);
  const csvImportRef = useRef(null);
  
  // Business Details State
  const [businessDetails, setBusinessDetails] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    gst: '',
    fssai: '',
    upiId: '',
    logo: '',
    currencySymbol: '₹',
    taxLabel: 'GST',
    footerMessage: '',
    printBusinessName: true,
    printAddress: true,
    printPhone: true,
    printEmail: true,
    printGst: true,
    printFssai: true,
    printHeaderDivider: true,
    printItems: true,
    printTaxBreakdown: true,
    printServiceCharge: true,
    printGatewayCharges: true,
    printFooter: true,
    printQrCode: true
  });
  
  // Table Management State
  const [tables, setTables] = useState([]);
  const [editingTable, setEditingTable] = useState(null);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState(4);
  
  // Category Management State
  const [categories, setCategories] = useState([]);
  const [editingCategory, setEditingCategory] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('📦');
  const [newCategoryColor, setNewCategoryColor] = useState(COLORS.primary);
  const [newCategorySortOrder, setNewCategorySortOrder] = useState(0);
  const [newCategoryShowInKitchen, setNewCategoryShowInKitchen] = useState(true);
  const [newCategoryShowInMenu, setNewCategoryShowInMenu] = useState(true);
  
  // Item Management State
  const [items, setItems] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  const [newItemPrepTime, setNewItemPrepTime] = useState(10);
  const [newItemAvailable, setNewItemAvailable] = useState(true);
  
  // CSV Import/Export State
  const [csvPreview, setCsvPreview] = useState([]);
  const [csvMapping, setCsvMapping] = useState({
    name: 'name',
    price: 'price',
    category: 'category',
    prepTime: 'prepTime',
    available: 'available'
  });
  const [csvData, setCsvData] = useState([]);
  const [showCsvMapping, setShowCsvMapping] = useState(false);
  
  // Import/Export State
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState('');
  const [importStep, setImportStep] = useState('');
  const [importDetails, setImportDetails] = useState({ itemsProcessed: 0, itemsSuccess: 0, itemsFailed: 0, categoriesCreated: 0 });
  const [backupList, setBackupList] = useState([]);
  
  // Notification State
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [checkingNotifications, setCheckingNotifications] = useState(false);
  
  // General Settings State
  const [generalSettings, setGeneralSettings] = useState({
    taxRate: 10,
    serviceCharge: 0,
    kitchenPrint: true,
    autoAcceptOrders: false,
    soundEnabled: true,
    theme: 'light'
  });
  const [settingsLoading, setSettingsLoading] = useState(true);

  const API_URL = process.env.REACT_APP_API_URL || 'https://server-uvyi.onrender.com/api';

  // Check notification status on mount
  useEffect(() => {
    checkNotificationStatus();
  }, []);

  const checkNotificationStatus = async () => {
    try {
      setCheckingNotifications(true);
      await notificationService.init();
      const subscription = await notificationService.getSubscription();
      setNotificationsEnabled(!!subscription);
    } catch (error) {
      console.error('Error checking notification status:', error);
    } finally {
      setCheckingNotifications(false);
    }
  };

  const enableNotifications = async () => {
    setLoading(true);
    try {
      const success = await notificationService.init();
      if (success) {
        const subscription = await notificationService.subscribe();
        if (subscription) {
          setNotificationsEnabled(true);
          console.log('Push notifications enabled!');
          notificationService.showLocalNotification('Notifications Enabled', {
            body: 'You will now receive order updates and alerts.',
            tag: 'welcome'
          });
        }
      } else {
        console.error('Please allow notification permissions');
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      console.error('Failed to enable notifications');
    } finally {
      setLoading(false);
    }
  };

  const disableNotifications = async () => {
    setLoading(true);
    try {
      await notificationService.unsubscribe();
      setNotificationsEnabled(false);
      console.log('Notifications disabled');
    } catch (error) {
      console.error('Error disabling notifications:', error);
      console.error('Failed to disable notifications');
    } finally {
      setLoading(false);
    }
  };

  const testNotification = async () => {
    setLoading(true);
    try {
      await notificationService.testNotification();
      console.log('Test notification sent!');
    } catch (error) {
      console.error('Error sending test notification:', error);
      console.error('Failed to send test notification');
    } finally {
      setLoading(false);
    }
  };

  // Load all data from backend on mount
  useEffect(() => {
    fetchCategories();
    fetchItems();
    fetchTables();
    fetchBusinessDetails();
    fetchGeneralSettings();
  }, []);

  // Helper function to parse CSV line with quoted fields
  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    
    return result.map(val => val.replace(/^"|"$/g, '').trim());
  };

  const fetchBusinessDetails = async () => {
    try {
      const response = await fetch(`${API_URL}/business`);
      if (response.ok) {
        const data = await response.json();
        setBusinessDetails(data);
      }
    } catch (error) {
      console.error('Error fetching business details:', error);
    }
  };

  const fetchTables = async () => {
    try {
      const response = await fetch(`${API_URL}/tables`);
      if (response.ok) {
        const data = await response.json();
        setTables(data);
      }
    } catch (error) {
      console.error('Error fetching tables:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/categories`);
      if (response.ok) {
        const data = await response.json();
        const cleanedData = data.map(cat => ({
          ...cat,
          name: cat.name.replace(/[^\w\s]/g, '').trim(),
          icon: ''
        }));
        const sortedData = [...cleanedData].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        setCategories(sortedData);
        console.log('Categories loaded in settings:', sortedData);
      } else {
        const cleanedInitial = (initialCategories || []).map(cat => ({
          ...cat,
          name: cat.name?.replace(/[^\w\s]/g, '').trim() || cat.name,
          icon: ''
        }));
        setCategories(cleanedInitial);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      const cleanedInitial = (initialCategories || []).map(cat => ({
        ...cat,
        name: cat.name?.replace(/[^\w\s]/g, '').trim() || cat.name,
        icon: ''
      }));
      setCategories(cleanedInitial);
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async () => {
    try {
      const response = await fetch(`${API_URL}/menu`);
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      } else {
        setItems(initialMenu || []);
      }
    } catch (error) {
      console.error('Error fetching items:', error);
      setItems(initialMenu || []);
    }
  };

  const fetchGeneralSettings = async () => {
    try {
      const response = await fetch(`${API_URL}/settings`);
      if (response.ok) {
        const data = await response.json();
        setGeneralSettings(data);
        if (data.theme === 'dark') {
          document.documentElement.setAttribute('data-theme', 'dark');
        } else {
          document.documentElement.setAttribute('data-theme', 'light');
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setSettingsLoading(false);
    }
  };

  // Business Details Functions
  const saveBusinessDetails = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/business`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(businessDetails)
      });
      
      if (response.ok) {
        console.log('Business details saved successfully');
        if (onSettingsUpdate) {
          onSettingsUpdate({ businessDetails });
        }
      } else {
        console.error('Failed to save business details');
      }
    } catch (error) {
      console.error('Error saving business details:', error);
      console.error('Failed to save business details');
    } finally {
      setLoading(false);
    }
  };

  // Table Management Functions
  const addTable = async () => {
    if (!newTableNumber) {
      console.error('Please enter table number');
      return;
    }
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/tables`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          tableNumber: parseInt(newTableNumber),
          capacity: newTableCapacity,
          status: 'available'
        })
      });
      
      if (response.ok) {
        const newTable = await response.json();
        console.log(`Table ${newTableNumber} added`);
        setTables([...tables, newTable]);
        setNewTableNumber('');
        setNewTableCapacity(4);
      } else {
        const error = await response.json();
        console.error(error.error || 'Failed to add table');
      }
    } catch (error) {
      console.error('Failed to add table');
    } finally {
      setLoading(false);
    }
  };

  const updateTable = async (table) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/tables/${table.tableNumber}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          capacity: table.capacity,
          status: table.status
        })
      });
      
      if (response.ok) {
        const updatedTable = await response.json();
        console.log(`Table ${table.tableNumber} updated`);
        setTables(tables.map(t => t.tableNumber === table.tableNumber ? updatedTable : t));
        setEditingTable(null);
      } else {
        console.error('Failed to update table');
      }
    } catch (error) {
      console.error('Failed to update table');
    } finally {
      setLoading(false);
    }
  };

  const deleteTable = async (tableNumber) => {
    if (!window.confirm(`Delete Table ${tableNumber}?`)) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/tables/${tableNumber}`, {
        method: 'DELETE',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      
      if (response.ok) {
        console.log(`Table ${tableNumber} deleted`);
        setTables(tables.filter(t => t.tableNumber !== tableNumber));
      } else {
        console.error('Failed to delete table');
      }
    } catch (error) {
      console.error('Failed to delete table');
    } finally {
      setLoading(false);
    }
  };

  // Category Management Functions
  const addCategory = async () => {
    const cleanName = newCategoryName.replace(/[^\w\s]/g, '').trim();
    if (!cleanName) {
      console.error('Please enter category name');
      return;
    }
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          name: cleanName,
          icon: '',
          bgColor: newCategoryColor,
          sortOrder: newCategorySortOrder,
          showInKitchen: newCategoryShowInKitchen,
          showInMenu: newCategoryShowInMenu
        })
      });
      
      if (response.ok) {
        const newCategory = await response.json();
        console.log(`Category ${cleanName} added`);
        const updatedCategories = [...categories, { ...newCategory, icon: '' }].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        setCategories(updatedCategories);
        setNewCategoryName('');
        setNewCategoryIcon('');
        setNewCategoryColor(COLORS.primary);
        setNewCategorySortOrder(0);
        setNewCategoryShowInKitchen(true);
        setNewCategoryShowInMenu(true);
        if (onSettingsUpdate) onSettingsUpdate();
      } else {
        const error = await response.json();
        console.error(error.error || 'Failed to add category');
      }
    } catch (error) {
      console.error('Error adding category:', error);
      console.error('Failed to add category');
    } finally {
      setLoading(false);
    }
  };

  const updateCategory = async (category) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/categories/${category._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          name: category.name,
          icon: category.icon,
          bgColor: category.bgColor,
          sortOrder: category.sortOrder,
          showInKitchen: category.showInKitchen,
          showInMenu: category.showInMenu
        })
      });
      
      if (response.ok) {
        const updatedCategory = await response.json();
        console.log(`Category ${category.name} updated`);
        const updatedCategories = categories.map(c => c._id === category._id ? updatedCategory : c).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        setCategories(updatedCategories);
        setEditingCategory(null);
        if (onSettingsUpdate) onSettingsUpdate();
      } else {
        console.error('Failed to update category');
      }
    } catch (error) {
      console.error('Error updating category:', error);
      console.error('Failed to update category');
    } finally {
      setLoading(false);
    }
  };

  const deleteCategory = async (categoryId, categoryName) => {
    if (!window.confirm(`Delete category "${categoryName}"? Items in this category will be moved to uncategorized.`)) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/categories/${categoryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      
      if (response.ok) {
        console.log(`Category ${categoryName} deleted`);
        setCategories(categories.filter(c => c._id !== categoryId));
        fetchItems();
        if (onSettingsUpdate) onSettingsUpdate();
      } else {
        const error = await response.json();
        console.error(error.error || 'Failed to delete category');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      console.error('Failed to delete category');
    } finally {
      setLoading(false);
    }
  };

  // Move category up/down
  const moveCategory = async (index, direction) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= categories.length) return;
    
    const updatedCategories = [...categories];
    const temp = updatedCategories[index];
    updatedCategories[index] = updatedCategories[newIndex];
    updatedCategories[newIndex] = temp;
    
    const reorderedCategories = updatedCategories.map((cat, idx) => ({
      ...cat,
      sortOrder: idx
    }));
    
    setCategories(reorderedCategories);
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const updates = reorderedCategories.map(cat => ({
        id: cat._id,
        sortOrder: cat.sortOrder
      }));
      
      const response = await fetch(`${API_URL}/categories/reorder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ categories: updates })
      });
      
      if (response.ok) {
        console.log('Category order updated');
      } else {
        console.error('Failed to update order');
        fetchCategories();
      }
    } catch (error) {
      console.error('Error reordering categories:', error);
      console.error('Failed to update order');
      fetchCategories();
    } finally {
      setLoading(false);
    }
  };

  // Item Management Functions
  const addItem = async () => {
    if (!newItemName || !newItemPrice || !newItemCategory) {
      console.error('Please fill all required fields');
      return;
    }
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/menu`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          name: newItemName,
          price: parseFloat(newItemPrice),
          category: newItemCategory,
          prepTime: newItemPrepTime,
          available: newItemAvailable
        })
      });
      
      if (response.ok) {
        const newItem = await response.json();
        console.log(`Item ${newItemName} added`);
        setItems([...items, newItem]);
        setNewItemName('');
        setNewItemPrice('');
        setNewItemPrepTime(10);
        setNewItemAvailable(true);
        if (onSettingsUpdate) onSettingsUpdate();
      } else {
        const error = await response.json();
        console.error(error.error || 'Failed to add item');
      }
    } catch (error) {
      console.error('Error adding item:', error);
      console.error('Failed to add item');
    } finally {
      setLoading(false);
    }
  };

  const updateItem = async (item) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/menu/${item._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          name: item.name,
          price: item.price,
          category: item.category,
          prepTime: item.prepTime,
          available: item.available
        })
      });
      
      if (response.ok) {
        const updatedItem = await response.json();
        console.log(`Item ${item.name} updated`);
        setItems(items.map(i => i._id === item._id ? updatedItem : i));
        setEditingItem(null);
        if (onSettingsUpdate) onSettingsUpdate();
      } else {
        console.error('Failed to update item');
      }
    } catch (error) {
      console.error('Error updating item:', error);
      console.error('Failed to update item');
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (itemId, itemName) => {
    if (!window.confirm(`Delete item "${itemName}"?`)) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/menu/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      
      if (response.ok) {
        console.log(`Item ${itemName} deleted`);
        setItems(items.filter(i => i._id !== itemId));
        if (onSettingsUpdate) onSettingsUpdate();
      } else {
        console.error('Failed to delete item');
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      console.error('Failed to delete item');
    } finally {
      setLoading(false);
    }
  };

  // CSV Export Function
  const exportToCSV = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const menuResponse = await fetch(`${API_URL}/menu`, {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });
      const categoriesResponse = await fetch(`${API_URL}/categories`, {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });
      
      if (!menuResponse.ok || !categoriesResponse.ok) {
        throw new Error('Failed to fetch data');
      }
      
      const menuData = await menuResponse.json();
      const categoriesData = await categoriesResponse.json();
      
      const categoryMap = new Map();
      categoriesData.forEach(cat => {
        categoryMap.set(cat._id, {
          name: cat.name,
          icon: cat.icon || '📦',
          bgColor: cat.bgColor || '#95a5a6'
        });
      });
      
      const csvRows = [
        ['Name', 'Price', 'Category', 'Category Icon', 'Category Color', 'Prep Time (min)', 'Available', 'Description']
      ];
      
      menuData.forEach(item => {
        const category = categoryMap.get(item.category) || { name: 'Uncategorized', icon: '📦', bgColor: '#95a5a6' };
        csvRows.push([
          item.name,
          item.price,
          category.name,
          category.icon,
          category.bgColor,
          item.prepTime || 10,
          item.available ? 'Yes' : 'No',
          item.description || ''
        ]);
      });
      
      const csvContent = csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `menu_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log('Menu exported to CSV successfully');
    } catch (error) {
      console.error('CSV Export error:', error);
      console.error('Failed to export CSV: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // CSV Import Function
  const importFromCSV = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    console.log('Reading CSV file...');
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      
      const rows = [];
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        console.error('CSV file is empty');
        return;
      }
      
      const headers = parseCSVLine(lines[0]);
      console.log('Detected headers:', headers);
      
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = parseCSVLine(lines[i]);
          const item = {};
          headers.forEach((header, index) => {
            item[header] = values[index] || '';
          });
          rows.push(item);
        }
      }
      
      console.log(`Parsed ${rows.length} items from CSV`);
      
      if (rows.length === 0) {
        console.error('No valid data found in CSV');
        return;
      }
      
      setCsvData(rows);
      setCsvPreview(rows.slice(0, 5));
      setShowCsvMapping(true);
      console.log(`Loaded ${rows.length} items from CSV`);
    };
    
    reader.onerror = () => {
      console.error('Failed to read CSV file');
    };
    
    reader.readAsText(file, 'UTF-8');
  };

  // Process CSV Import with progressive view
  const processCSVImport = async () => {
    if (loading) return;
    setLoading(true);
    setImportProgress(0);
    setImportStatus('Starting import...');
    setImportStep('initializing');
    setImportDetails({ itemsProcessed: 0, itemsSuccess: 0, itemsFailed: 0, categoriesCreated: 0 });
    
    try {
      let successCount = 0;
      let failCount = 0;
      const errors = [];
      const token = localStorage.getItem('token');
      
      console.log('CSV Data to import:', csvData.length, 'items');
      
      if (!csvData || csvData.length === 0) {
        console.error('No data to import');
        setLoading(false);
        return;
      }
      
      // Step 1: Delete all existing menu items
      setImportStep('deleting_items');
      setImportStatus('Deleting existing menu items...');
      setImportProgress(5);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const existingMenuResponse = await fetch(`${API_URL}/menu`, {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });
      
      if (existingMenuResponse.ok) {
        const existingItems = await existingMenuResponse.json();
        console.log(`Deleting ${existingItems.length} existing menu items...`);
        
        for (let i = 0; i < existingItems.length; i++) {
          const item = existingItems[i];
          await fetch(`${API_URL}/menu/${item._id}`, {
            method: 'DELETE',
            headers: { 'Authorization': token ? `Bearer ${token}` : '' }
          });
          if (i % 20 === 0) {
            setImportProgress(5 + Math.floor((i / existingItems.length) * 10));
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        }
        console.log(`Deleted ${existingItems.length} existing menu items`);
      }
      
      // Step 2: Delete all existing categories
      setImportStep('deleting_categories');
      setImportStatus('Deleting existing categories...');
      setImportProgress(15);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const existingCategoriesResponse = await fetch(`${API_URL}/categories`, {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });
      
      if (existingCategoriesResponse.ok) {
        const existingCategories = await existingCategoriesResponse.json();
        console.log(`Deleting ${existingCategories.length} existing categories...`);
        
        for (const category of existingCategories) {
          await fetch(`${API_URL}/categories/${category._id}`, {
            method: 'DELETE',
            headers: { 'Authorization': token ? `Bearer ${token}` : '' }
          });
        }
        console.log(`Deleted ${existingCategories.length} existing categories`);
      }
      
      // Step 3: Import categories from CSV
      setImportStep('creating_categories');
      setImportStatus('Creating new categories...');
      setImportProgress(20);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const uniqueCategories = new Map();
      for (const item of csvData) {
        let categoryName = item[csvMapping.category] || item.category || item.Category || 'Uncategorized';
        categoryName = String(categoryName).trim();
        if (!categoryName || categoryName === 'undefined' || categoryName === 'null' || categoryName === '') {
          categoryName = 'Uncategorized';
        }
        
        if (!uniqueCategories.has(categoryName)) {
          let categoryColor = '#95a5a6';
          const colorFromCSV = item['Category Color'] || item.categoryColor;
          if (colorFromCSV && colorFromCSV.startsWith('#')) {
            categoryColor = colorFromCSV;
          }
          
          uniqueCategories.set(categoryName, {
            name: categoryName,
            icon: item['Category Icon'] || item.categoryIcon || '📦',
            bgColor: categoryColor,
            showInMenu: true,
            showInKitchen: true,
            sortOrder: uniqueCategories.size
          });
        }
      }
      
      console.log(`Found ${uniqueCategories.size} unique categories to create`);
      
      const categoryIdMap = new Map();
      let createdCategories = 0;
      const categoriesList = Array.from(uniqueCategories.entries());
      
      for (let i = 0; i < categoriesList.length; i++) {
        const [catName, catData] = categoriesList[i];
        try {
          const response = await fetch(`${API_URL}/categories`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify(catData)
          });
          
          if (response.ok) {
            const newCategory = await response.json();
            categoryIdMap.set(catName.toLowerCase(), newCategory._id);
            createdCategories++;
            setImportDetails(prev => ({ ...prev, categoriesCreated: createdCategories }));
            console.log(`Created category: ${catName}`);
          } else {
            const error = await response.json();
            errors.push(`Failed to create category "${catName}": ${error.error}`);
          }
        } catch (error) {
          errors.push(`Error creating category "${catName}": ${error.message}`);
        }
        
        const progress = 20 + Math.floor((i / categoriesList.length) * 20);
        setImportProgress(progress);
        setImportStatus(`Creating categories... ${createdCategories}/${categoriesList.length}`);
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      setImportProgress(40);
      setImportStep('importing_items');
      setImportStatus(`Importing ${csvData.length} menu items...`);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Step 4: Import menu items
      for (let i = 0; i < csvData.length; i++) {
        const item = csvData[i];
        
        let itemName = item[csvMapping.name] || item.name || item.Name;
        if (!itemName || String(itemName).trim() === '') {
          failCount++;
          setImportDetails(prev => ({ ...prev, itemsProcessed: i + 1, itemsFailed: failCount, itemsSuccess: successCount }));
          continue;
        }
        itemName = String(itemName).trim();
        
        let categoryName = item[csvMapping.category] || item.category || item.Category || 'Uncategorized';
        categoryName = String(categoryName).trim();
        if (!categoryName || categoryName === 'undefined' || categoryName === 'null' || categoryName === '') {
          categoryName = 'Uncategorized';
        }
        let categoryId = categoryIdMap.get(categoryName.toLowerCase());
        
        let price = parseFloat(item[csvMapping.price] || item.price || 0);
        if (isNaN(price)) price = 0;
        
        let prepTime = parseInt(item[csvMapping.prepTime] || item.prepTime || item['Prep Time (min)'] || 10);
        if (isNaN(prepTime)) prepTime = 10;
        
        let availableValue = item[csvMapping.available] || item.available || item.Available || 'Yes';
        availableValue = String(availableValue).toLowerCase();
        const available = availableValue === 'yes' || availableValue === 'true' || availableValue === '1';
        
        const newItem = {
          name: itemName,
          price: price,
          category: categoryId || '',
          prepTime: prepTime,
          available: available,
          description: item.description || item.Description || ''
        };
        
        if (newItem.name && newItem.price >= 0) {
          try {
            const response = await fetch(`${API_URL}/menu`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
              },
              body: JSON.stringify(newItem)
            });
            
            if (response.ok) {
              successCount++;
            } else {
              const error = await response.json();
              errors.push(`${itemName}: ${error.error || 'Failed to add item'}`);
              failCount++;
            }
          } catch (error) {
            errors.push(`${itemName}: ${error.message}`);
            failCount++;
          }
        } else {
          errors.push(`${itemName}: Invalid item data`);
          failCount++;
        }
        
        setImportDetails({
          itemsProcessed: i + 1,
          itemsSuccess: successCount,
          itemsFailed: failCount,
          categoriesCreated: createdCategories
        });
        
        const progressPercent = 40 + Math.floor(((i + 1) / csvData.length) * 60);
        setImportProgress(progressPercent);
        setImportStatus(`Importing items... ${successCount} added, ${failCount} failed`);
        
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
      
      setImportProgress(100);
      setImportStep('complete');
      setImportStatus(`Complete! ${successCount} items imported, ${failCount} failed, ${createdCategories} categories created`);
      
      if (errors.length > 0) {
        console.error('Import errors (first 20):', errors.slice(0, 20));
        console.error(`Imported ${successCount} items, ${failCount} failed. Check console for details.`);
      } else {
        console.log(`Successfully imported ${successCount} items and ${createdCategories} categories`);
      }
      
      setShowCsvMapping(false);
      
      await fetchCategories();
      await fetchItems();
      
      if (onSettingsUpdate) onSettingsUpdate();
      
      if (csvImportRef.current) {
        csvImportRef.current.value = '';
      }
      
      setTimeout(() => {
        setImportProgress(0);
        setImportStatus('');
        setImportStep('');
      }, 5000);
      
    } catch (error) {
      console.error('CSV Import error:', error);
      console.error('Failed to import CSV: ' + error.message);
      setImportProgress(0);
      setImportStatus('');
      setImportStep('');
    } finally {
      setLoading(false);
    }
  };

  // JSON Export Functionality
  const exportDataToFile = async (type) => {
    setLoading(true);
    try {
      let data = {};
      
      if (type === 'all' || type === 'menu') {
        data.menu = items;
        data.categories = categories;
      }
      
      if (type === 'all' || type === 'settings') {
        data.settings = generalSettings;
        data.businessDetails = businessDetails;
      }
      
      if (type === 'all' || type === 'tables') {
        data.tables = tables;
      }
      
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        type: type,
        data: data
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pos_export_${type}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log(`${type.toUpperCase()} data exported successfully`);
    } catch (error) {
      console.error('Export error:', error);
      console.error('Failed to export data');
    } finally {
      setLoading(false);
    }
  };

  // JSON Import Functionality
  const importDataFromFile = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setLoading(true);
    setImportProgress(0);
    setImportStatus('Reading file...');
    setImportStep('reading');
    
    try {
      const text = await file.text();
      const importData = JSON.parse(text);
      
      setImportStatus('Validating data...');
      setImportProgress(20);
      setImportStep('validating');
      
      if (!importData.version || !importData.data) {
        throw new Error('Invalid file format');
      }
      
      const token = localStorage.getItem('token');
      
      if (importData.data.menu && importData.data.menu.length > 0) {
        setImportStatus(`Importing ${importData.data.menu.length} menu items...`);
        setImportProgress(40);
        setImportStep('importing_menu');
        
        for (const item of importData.data.menu) {
          const response = await fetch(`${API_URL}/menu`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify(item)
          });
          if (response.ok) {
            const savedItem = await response.json();
            setItems(prev => [...prev, savedItem]);
          }
        }
        console.log(`Imported ${importData.data.menu.length} menu items`);
      }
      
      if (importData.data.categories && importData.data.categories.length > 0) {
        setImportStatus(`Importing ${importData.data.categories.length} categories...`);
        setImportProgress(60);
        setImportStep('importing_categories');
        
        for (const category of importData.data.categories) {
          const response = await fetch(`${API_URL}/categories`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify(category)
          });
          if (response.ok) {
            const savedCat = await response.json();
            setCategories(prev => [...prev, savedCat]);
          }
        }
        console.log(`Imported ${importData.data.categories.length} categories`);
      }
      
      if (importData.data.settings) {
        setImportStatus('Importing settings...');
        setImportProgress(80);
        setImportStep('importing_settings');
        
        await fetch(`${API_URL}/settings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          body: JSON.stringify(importData.data.settings)
        });
        setGeneralSettings(importData.data.settings);
        console.log('Settings imported');
      }
      
      if (importData.data.businessDetails) {
        setBusinessDetails(importData.data.businessDetails);
        await fetch(`${API_URL}/business`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          body: JSON.stringify(importData.data.businessDetails)
        });
        console.log('Business details imported');
      }
      
      if (importData.data.tables && importData.data.tables.length > 0) {
        for (const table of importData.data.tables) {
          await fetch(`${API_URL}/tables`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify(table)
          });
        }
        setTables(importData.data.tables);
        console.log('Tables imported');
      }
      
      setImportProgress(100);
      setImportStatus('Import completed!');
      setImportStep('complete');
      
      if (onSettingsUpdate) onSettingsUpdate();
      
      setTimeout(() => {
        setImportProgress(0);
        setImportStatus('');
        setImportStep('');
      }, 3000);
      
    } catch (error) {
      console.error('Import error:', error);
      console.error('Failed to import data: ' + error.message);
      setImportProgress(0);
      setImportStatus('');
      setImportStep('');
    } finally {
      setLoading(false);
      if (importFileInputRef.current) importFileInputRef.current.value = '';
    }
  };

  // Backup Functionality
  const createBackup = async () => {
    setLoading(true);
    try {
      const backupData = {
        version: '1.0',
        backupDate: new Date().toISOString(),
        data: {
          menu: items,
          categories: categories,
          tables: tables,
          settings: generalSettings,
          businessDetails: businessDetails
        }
      };
      
      const backups = JSON.parse(localStorage.getItem('pos_backups') || '[]');
      backups.unshift({
        id: Date.now(),
        date: new Date().toISOString(),
        size: JSON.stringify(backupData).length,
        data: backupData
      });
      
      if (backups.length > 10) backups.pop();
      
      localStorage.setItem('pos_backups', JSON.stringify(backups));
      loadBackupList();
      
      console.log('Backup created successfully');
    } catch (error) {
      console.error('Backup error:', error);
      console.error('Failed to create backup');
    } finally {
      setLoading(false);
    }
  };

  const loadBackupList = () => {
    const backups = JSON.parse(localStorage.getItem('pos_backups') || '[]');
    setBackupList(backups);
  };

  const restoreBackup = async (backup) => {
    if (!window.confirm(`Restore backup from ${new Date(backup.date).toLocaleString()}? This will overwrite current data.`)) return;
    
    setLoading(true);
    try {
      const data = backup.data.data;
      const token = localStorage.getItem('token');
      
      if (data.categories && data.categories.length > 0) {
        for (const category of data.categories) {
          await fetch(`${API_URL}/categories`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify(category)
          });
        }
        setCategories(data.categories);
      }
      
      if (data.menu && data.menu.length > 0) {
        for (const item of data.menu) {
          await fetch(`${API_URL}/menu`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify(item)
          });
        }
        setItems(data.menu);
      }
      
      if (data.settings) {
        await fetch(`${API_URL}/settings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          body: JSON.stringify(data.settings)
        });
        setGeneralSettings(data.settings);
      }
      
      if (data.businessDetails) {
        setBusinessDetails(data.businessDetails);
        await fetch(`${API_URL}/business`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          body: JSON.stringify(data.businessDetails)
        });
      }
      
      if (data.tables && data.tables.length > 0) {
        for (const table of data.tables) {
          await fetch(`${API_URL}/tables`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify(table)
          });
        }
        setTables(data.tables);
      }
      
      console.log('Backup restored successfully');
      if (onSettingsUpdate) onSettingsUpdate();
      
    } catch (error) {
      console.error('Restore error:', error);
      console.error('Failed to restore backup');
    } finally {
      setLoading(false);
    }
  };

  const deleteBackup = (backupId) => {
    if (!window.confirm('Delete this backup?')) return;
    
    const backups = JSON.parse(localStorage.getItem('pos_backups') || '[]');
    const filtered = backups.filter(b => b.id !== backupId);
    localStorage.setItem('pos_backups', JSON.stringify(filtered));
    loadBackupList();
    console.log('Backup deleted');
  };

  const downloadBackup = (backup) => {
    const blob = new Blob([JSON.stringify(backup.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pos_backup_${new Date(backup.date).toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('Backup downloaded');
  };

  const saveGeneralSettings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(generalSettings)
      });
      
      if (response.ok) {
        console.log('Settings saved');
        if (onSettingsUpdate) onSettingsUpdate(generalSettings);
      } else {
        console.error('Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getStepIcon = () => {
    switch(importStep) {
      case 'deleting_items': return '🗑️';
      case 'deleting_categories': return '📁';
      case 'creating_categories': return '🏷️';
      case 'importing_items': return '📦';
      case 'complete': return '✅';
      default: return '🔄';
    }
  };

  const tabs = [
    { id: 'business', label: 'Business', icon: FiHome },
    { id: 'tables', label: 'Tables', icon: FiUsers },
    { id: 'categories', label: 'Categories', icon: FiTag },
    { id: 'items', label: 'Menu Items', icon: FiPackage },
    { id: 'importexport', label: 'Import/Export', icon: FiUpload },
    { id: 'backup', label: 'Backup', icon: FiDatabase },
    { id: 'general', label: 'General', icon: FiSettings },
    { id: 'notifications', label: 'Notifications', icon: FiBell },
    { id: 'users', label: 'Users', icon: FiUsers }
  ];

  const PrintToggle = ({ label, field, icon: Icon }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${COLORS.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {Icon && <Icon size={14} color={COLORS.textMuted} />}
        <span style={{ fontSize: '11px', fontWeight: '500', color: COLORS.textPrimary }}>{label}</span>
      </div>
      <button
        onClick={() => setBusinessDetails({ ...businessDetails, [field]: !businessDetails[field] })}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          color: businessDetails[field] ? COLORS.success : COLORS.textMuted
        }}
      >
        {businessDetails[field] ? <FiToggleRight size={20} /> : <FiToggleLeft size={20} />}
      </button>
    </div>
  );

  return (
    <div style={{ padding: '12px', maxWidth: '1200px', margin: '0 auto', background: COLORS.neutralDark, minHeight: '100vh' }}>
      <h1 style={{ fontSize: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: COLORS.textPrimary }}>
        <FiSettings color={COLORS.primary} /> Settings
      </h1>
      
      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '16px',
        borderBottom: `1px solid ${COLORS.border}`,
        paddingBottom: '8px',
        flexWrap: 'wrap',
        overflowX: 'auto'
      }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '6px 12px',
                background: activeTab === tab.id ? COLORS.primary : 'transparent',
                color: activeTab === tab.id ? COLORS.textPrimary : COLORS.textSecondary,
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap'
              }}
            >
              <Icon size={12} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Business Details Section */}
      {activeTab === 'business' && (
        <div>
          <div style={{ background: COLORS.bgCard, borderRadius: '8px', padding: '20px', marginBottom: '16px', border: `1px solid ${COLORS.border}` }}>
            <h3 style={{ fontSize: '14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: COLORS.textPrimary }}>
              <FiHome size={16} color={COLORS.primary} /> Business Information
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '11px', color: COLORS.textSecondary, display: 'block', marginBottom: '4px' }}>Business Name</label>
                <input
                  type="text"
                  value={businessDetails.name}
                  onChange={(e) => setBusinessDetails({ ...businessDetails, name: e.target.value })}
                  style={{ width: '100%', padding: '8px', background: COLORS.neutralLight, border: `1px solid ${COLORS.border}`, borderRadius: '6px', color: COLORS.textPrimary }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: COLORS.textSecondary, display: 'block', marginBottom: '4px' }}>Address</label>
                <input
                  type="text"
                  value={businessDetails.address}
                  onChange={(e) => setBusinessDetails({ ...businessDetails, address: e.target.value })}
                  style={{ width: '100%', padding: '8px', background: COLORS.neutralLight, border: `1px solid ${COLORS.border}`, borderRadius: '6px', color: COLORS.textPrimary }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: COLORS.textSecondary, display: 'block', marginBottom: '4px' }}>Phone Number</label>
                <input
                  type="text"
                  value={businessDetails.phone}
                  onChange={(e) => setBusinessDetails({ ...businessDetails, phone: e.target.value })}
                  style={{ width: '100%', padding: '8px', background: COLORS.neutralLight, border: `1px solid ${COLORS.border}`, borderRadius: '6px', color: COLORS.textPrimary }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: COLORS.textSecondary, display: 'block', marginBottom: '4px' }}>Email</label>
                <input
                  type="email"
                  value={businessDetails.email}
                  onChange={(e) => setBusinessDetails({ ...businessDetails, email: e.target.value })}
                  style={{ width: '100%', padding: '8px', background: COLORS.neutralLight, border: `1px solid ${COLORS.border}`, borderRadius: '6px', color: COLORS.textPrimary }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: COLORS.textSecondary, display: 'block', marginBottom: '4px' }}>GST Number</label>
                <input
                  type="text"
                  value={businessDetails.gst}
                  onChange={(e) => setBusinessDetails({ ...businessDetails, gst: e.target.value })}
                  style={{ width: '100%', padding: '8px', background: COLORS.neutralLight, border: `1px solid ${COLORS.border}`, borderRadius: '6px', color: COLORS.textPrimary }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: COLORS.textSecondary, display: 'block', marginBottom: '4px' }}>FSSAI Number</label>
                <input
                  type="text"
                  value={businessDetails.fssai}
                  onChange={(e) => setBusinessDetails({ ...businessDetails, fssai: e.target.value })}
                  style={{ width: '100%', padding: '8px', background: COLORS.neutralLight, border: `1px solid ${COLORS.border}`, borderRadius: '6px', color: COLORS.textPrimary }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: COLORS.textSecondary, display: 'block', marginBottom: '4px' }}>UPI ID (for QR Code)</label>
                <input
                  type="text"
                  value={businessDetails.upiId}
                  onChange={(e) => setBusinessDetails({ ...businessDetails, upiId: e.target.value })}
                  style={{ width: '100%', padding: '8px', background: COLORS.neutralLight, border: `1px solid ${COLORS.border}`, borderRadius: '6px', color: COLORS.textPrimary }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: COLORS.textSecondary, display: 'block', marginBottom: '4px' }}>Footer Message</label>
                <input
                  type="text"
                  value={businessDetails.footerMessage}
                  onChange={(e) => setBusinessDetails({ ...businessDetails, footerMessage: e.target.value })}
                  style={{ width: '100%', padding: '8px', background: COLORS.neutralLight, border: `1px solid ${COLORS.border}`, borderRadius: '6px', color: COLORS.textPrimary }}
                />
              </div>
            </div>
            <button onClick={saveBusinessDetails} disabled={loading} style={{ marginTop: '20px', padding: '8px 20px', background: COLORS.success, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FiSave size={12} /> {loading ? 'Saving...' : 'Save Business Details'}
            </button>
          </div>
          
          <div style={{ background: COLORS.bgCard, borderRadius: '8px', padding: '20px', border: `1px solid ${COLORS.border}` }}>
            <h3 style={{ fontSize: '14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: COLORS.textPrimary }}>
              <FiPrinter size={16} color={COLORS.primary} /> What to Print on Bill/Receipt
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              <PrintToggle label="Business Name" field="printBusinessName" icon={FiHome} />
              <PrintToggle label="Address" field="printAddress" icon={FiMapPin} />
              <PrintToggle label="Phone Number" field="printPhone" icon={FiPhone} />
              <PrintToggle label="Email" field="printEmail" icon={FiMail} />
              <PrintToggle label="GST Number" field="printGst" icon={FiInfo} />
              <PrintToggle label="FSSAI Number" field="printFssai" icon={FiInfo} />
              <PrintToggle label="Header Divider" field="printHeaderDivider" icon={FiGrid} />
              <PrintToggle label="Items List" field="printItems" icon={FiPackage} />
              <PrintToggle label="Tax Breakdown" field="printTaxBreakdown" icon={FiSettings} />
              <PrintToggle label="Service Charge" field="printServiceCharge" icon={FiSettings} />
              <PrintToggle label="Gateway Charges" field="printGatewayCharges" icon={FiCreditCard} />
              <PrintToggle label="Footer Message" field="printFooter" icon={FiMessageCircle} />
              <PrintToggle label="Payment QR Code (for pending bills)" field="printQrCode" icon={FiSmartphone} />
            </div>
            <button onClick={saveBusinessDetails} disabled={loading} style={{ marginTop: '20px', padding: '8px 20px', background: COLORS.success, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FiSave size={12} /> Save Print Settings
            </button>
          </div>
        </div>
      )}

      {/* Tables Management */}
      {activeTab === 'tables' && (
        <div>
          <div style={{ background: COLORS.bgCard, borderRadius: '8px', padding: '12px', marginBottom: '12px', border: `1px solid ${COLORS.border}` }}>
            <h3 style={{ fontSize: '12px', marginBottom: '12px', color: COLORS.textPrimary }}>Add New Table</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
              <input type="number" placeholder="Table Number" value={newTableNumber} onChange={(e) => setNewTableNumber(e.target.value)} style={{ padding: '6px', background: COLORS.neutralLight, border: `1px solid ${COLORS.border}`, borderRadius: '6px', fontSize: '11px', color: COLORS.textPrimary }} />
              <input type="number" placeholder="Capacity" value={newTableCapacity} onChange={(e) => setNewTableCapacity(parseInt(e.target.value))} style={{ padding: '6px', background: COLORS.neutralLight, border: `1px solid ${COLORS.border}`, borderRadius: '6px', fontSize: '11px', color: COLORS.textPrimary }} />
              <button onClick={addTable} disabled={loading} style={{ padding: '6px', background: COLORS.success, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}><FiPlus size={12} /> Add Table</button>
            </div>
          </div>
          <div style={{ background: COLORS.bgCard, borderRadius: '8px', padding: '12px', border: `1px solid ${COLORS.border}` }}>
            <h3 style={{ fontSize: '12px', marginBottom: '12px', color: COLORS.textPrimary }}>All Tables ({tables.length})</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
              {tables.map(table => (
                <div key={table.tableNumber} style={{ border: `1px solid ${COLORS.border}`, borderRadius: '6px', padding: '8px', background: table.status === 'occupied' ? `${COLORS.secondary}20` : COLORS.neutralLight }}>
                  {editingTable === table.tableNumber ? (
                    <>
                      <input type="number" value={table.capacity} onChange={(e) => {
                        const updated = { ...table, capacity: parseInt(e.target.value) };
                        setTables(tables.map(t => t.tableNumber === table.tableNumber ? updated : t));
                      }} style={{ width: '100%', padding: '4px', marginBottom: '6px', background: COLORS.neutralDark, border: `1px solid ${COLORS.border}`, borderRadius: '4px', fontSize: '10px', color: COLORS.textPrimary }} />
                      <select value={table.status} onChange={(e) => {
                        const updated = { ...table, status: e.target.value };
                        setTables(tables.map(t => t.tableNumber === table.tableNumber ? updated : t));
                      }} style={{ width: '100%', padding: '4px', marginBottom: '6px', background: COLORS.neutralDark, border: `1px solid ${COLORS.border}`, borderRadius: '4px', fontSize: '10px', color: COLORS.textPrimary }}>
                        <option value="available">Available</option>
                        <option value="occupied">Occupied</option>
                        <option value="reserved">Reserved</option>
                      </select>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={() => updateTable(table)} style={{ flex: 1, padding: '4px', background: COLORS.success, color: 'white', border: 'none', borderRadius: '4px', fontSize: '9px' }}>Save</button>
                        <button onClick={() => setEditingTable(null)} style={{ flex: 1, padding: '4px', background: COLORS.textMuted, color: 'white', border: 'none', borderRadius: '4px', fontSize: '9px' }}>Cancel</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <strong style={{ fontSize: '12px', color: COLORS.textPrimary }}>Table {table.tableNumber}</strong>
                        <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '10px', background: table.status === 'available' ? `${COLORS.success}20` : `${COLORS.secondary}20`, color: table.status === 'available' ? COLORS.success : COLORS.secondary }}>{table.status}</span>
                      </div>
                      <div style={{ fontSize: '10px', color: COLORS.textSecondary, marginBottom: '6px' }}>Capacity: {table.capacity}</div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={() => setEditingTable(table.tableNumber)} style={{ flex: 1, padding: '4px', background: COLORS.primary, color: 'white', border: 'none', borderRadius: '4px', fontSize: '9px' }}>Edit</button>
                        <button onClick={() => deleteTable(table.tableNumber)} style={{ flex: 1, padding: '4px', background: COLORS.danger, color: 'white', border: 'none', borderRadius: '4px', fontSize: '9px' }}>Delete</button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Categories Management */}
      {activeTab === 'categories' && (
        <div>
          <div style={{ background: COLORS.bgCard, borderRadius: '8px', padding: '12px', marginBottom: '12px', border: `1px solid ${COLORS.border}` }}>
            <h3 style={{ fontSize: '12px', marginBottom: '12px', color: COLORS.textPrimary }}>Add New Category</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '8px' }}>
              <input type="text" placeholder="Category Name" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} style={{ padding: '6px', background: COLORS.neutralLight, border: `1px solid ${COLORS.border}`, borderRadius: '6px', fontSize: '11px', color: COLORS.textPrimary }} />
              <input type="text" placeholder="Icon (emoji)" value={newCategoryIcon} onChange={(e) => setNewCategoryIcon(e.target.value)} style={{ padding: '6px', background: COLORS.neutralLight, border: `1px solid ${COLORS.border}`, borderRadius: '6px', fontSize: '11px', color: COLORS.textPrimary }} />
              <input type="color" value={newCategoryColor} onChange={(e) => setNewCategoryColor(e.target.value)} style={{ padding: '4px', border: `1px solid ${COLORS.border}`, borderRadius: '6px', height: '34px', background: COLORS.neutralLight }} />
              <input type="number" placeholder="Sort Order" value={newCategorySortOrder} onChange={(e) => setNewCategorySortOrder(parseInt(e.target.value))} style={{ padding: '6px', background: COLORS.neutralLight, border: `1px solid ${COLORS.border}`, borderRadius: '6px', fontSize: '11px', color: COLORS.textPrimary }} />
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: COLORS.textSecondary }}>
                <input type="checkbox" checked={newCategoryShowInMenu} onChange={(e) => setNewCategoryShowInMenu(e.target.checked)} /> Show in Menu
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: COLORS.textSecondary }}>
                <input type="checkbox" checked={newCategoryShowInKitchen} onChange={(e) => setNewCategoryShowInKitchen(e.target.checked)} /> Show in Kitchen
              </label>
              <button onClick={addCategory} disabled={loading} style={{ padding: '6px', background: COLORS.success, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}><FiPlus size={12} /> Add Category</button>
            </div>
          </div>
          <div style={{ background: COLORS.bgCard, borderRadius: '8px', padding: '12px', border: `1px solid ${COLORS.border}` }}>
            <h3 style={{ fontSize: '12px', marginBottom: '12px', color: COLORS.textPrimary }}>All Categories ({categories.length})</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '8px' }}>
              {categories.map((cat, index) => (
                <div key={cat._id} style={{ border: `1px solid ${COLORS.border}`, borderRadius: '6px', padding: '8px', background: cat.bgColor ? `${cat.bgColor}10` : COLORS.neutralLight }}>
                  {editingCategory === cat._id ? (
                    <>
                      <input value={cat.name} onChange={(e) => setCategories(categories.map(c => c._id === cat._id ? { ...c, name: e.target.value } : c))} style={{ width: '100%', padding: '4px', marginBottom: '6px', background: COLORS.neutralDark, border: `1px solid ${COLORS.border}`, borderRadius: '4px', fontSize: '10px', color: COLORS.textPrimary }} />
                      <input value={cat.icon} onChange={(e) => setCategories(categories.map(c => c._id === cat._id ? { ...c, icon: e.target.value } : c))} style={{ width: '100%', padding: '4px', marginBottom: '6px', background: COLORS.neutralDark, border: `1px solid ${COLORS.border}`, borderRadius: '4px', fontSize: '10px', color: COLORS.textPrimary }} />
                      <input type="number" value={cat.sortOrder || 0} onChange={(e) => setCategories(categories.map(c => c._id === cat._id ? { ...c, sortOrder: parseInt(e.target.value) } : c))} style={{ width: '100%', padding: '4px', marginBottom: '6px', background: COLORS.neutralDark, border: `1px solid ${COLORS.border}`, borderRadius: '4px', fontSize: '10px', color: COLORS.textPrimary }} />
                      <div style={{ display: 'flex', gap: '12px', marginBottom: '6px' }}>
                        <label style={{ fontSize: '9px', display: 'flex', alignItems: 'center', gap: '4px', color: COLORS.textSecondary }}>
                          <input type="checkbox" checked={cat.showInMenu !== false} onChange={(e) => setCategories(categories.map(c => c._id === cat._id ? { ...c, showInMenu: e.target.checked } : c))} /> Show in Menu
                        </label>
                        <label style={{ fontSize: '9px', display: 'flex', alignItems: 'center', gap: '4px', color: COLORS.textSecondary }}>
                          <input type="checkbox" checked={cat.showInKitchen !== false} onChange={(e) => setCategories(categories.map(c => c._id === cat._id ? { ...c, showInKitchen: e.target.checked } : c))} /> Show in Kitchen
                        </label>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={() => updateCategory(cat)} style={{ flex: 1, padding: '4px', background: COLORS.success, color: 'white', border: 'none', borderRadius: '4px', fontSize: '9px' }}>Save</button>
                        <button onClick={() => setEditingCategory(null)} style={{ flex: 1, padding: '4px', background: COLORS.textMuted, color: 'white', border: 'none', borderRadius: '4px', fontSize: '9px' }}>Cancel</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '24px' }}>{cat.icon}</span>
                          <strong style={{ fontSize: '12px', color: COLORS.textPrimary }}>{cat.name}</strong>
                        </div>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          {index > 0 && <button onClick={() => moveCategory(index, 'up')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.primary }}><FiArrowUp size={12} /></button>}
                          {index < categories.length - 1 && <button onClick={() => moveCategory(index, 'down')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.primary }}><FiArrowDown size={12} /></button>}
                          <span style={{ fontSize: '10px', color: COLORS.textSecondary }}>Order: {cat.sortOrder || 0}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '12px', marginBottom: '6px', fontSize: '9px' }}>
                        <span style={{ color: cat.showInMenu !== false ? COLORS.success : COLORS.danger }}>{cat.showInMenu !== false ? '✓ In Menu' : '✗ Hidden from Menu'}</span>
                        <span style={{ color: cat.showInKitchen !== false ? COLORS.success : COLORS.danger }}>{cat.showInKitchen !== false ? '✓ In Kitchen' : '✗ Hidden from Kitchen'}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={() => setEditingCategory(cat._id)} style={{ flex: 1, padding: '4px', background: COLORS.primary, color: 'white', border: 'none', borderRadius: '4px', fontSize: '9px' }}>Edit</button>
                        <button onClick={() => deleteCategory(cat._id, cat.name)} style={{ flex: 1, padding: '4px', background: COLORS.danger, color: 'white', border: 'none', borderRadius: '4px', fontSize: '9px' }}>Delete</button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Items Management */}
      {activeTab === 'items' && (
        <div>
          <div style={{ background: COLORS.bgCard, borderRadius: '8px', padding: '12px', marginBottom: '12px', border: `1px solid ${COLORS.border}` }}>
            <h3 style={{ fontSize: '12px', marginBottom: '12px', color: COLORS.textPrimary }}>Add New Item</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
              <input type="text" placeholder="Item Name" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} style={{ padding: '6px', background: COLORS.neutralLight, border: `1px solid ${COLORS.border}`, borderRadius: '6px', fontSize: '11px', color: COLORS.textPrimary }} />
              <input type="number" placeholder="Price" value={newItemPrice} onChange={(e) => setNewItemPrice(e.target.value)} style={{ padding: '6px', background: COLORS.neutralLight, border: `1px solid ${COLORS.border}`, borderRadius: '6px', fontSize: '11px', color: COLORS.textPrimary }} />
              <select value={newItemCategory} onChange={(e) => setNewItemCategory(e.target.value)} style={{ padding: '6px', background: COLORS.neutralLight, border: `1px solid ${COLORS.border}`, borderRadius: '6px', fontSize: '11px', color: COLORS.textPrimary }}>
                <option value="">Select Category</option>
                {categories.map(cat => (<option key={cat._id} value={cat._id}>{cat.name}</option>))}
              </select>
              <input type="number" placeholder="Prep Time (min)" value={newItemPrepTime} onChange={(e) => setNewItemPrepTime(parseInt(e.target.value))} style={{ padding: '6px', background: COLORS.neutralLight, border: `1px solid ${COLORS.border}`, borderRadius: '6px', fontSize: '11px', color: COLORS.textPrimary }} />
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: COLORS.textSecondary }}>
                <input type="checkbox" checked={newItemAvailable} onChange={(e) => setNewItemAvailable(e.target.checked)} /> Available
              </label>
              <button onClick={addItem} disabled={loading} style={{ padding: '6px', background: COLORS.success, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}><FiPlus size={12} /> Add Item</button>
            </div>
          </div>
          <div style={{ background: COLORS.bgCard, borderRadius: '8px', padding: '12px', border: `1px solid ${COLORS.border}` }}>
            <h3 style={{ fontSize: '12px', marginBottom: '12px', color: COLORS.textPrimary }}>All Items ({items.length})</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '8px' }}>
              {items.map(item => {
                const category = categories.find(c => c._id === item.category);
                return (
                  <div key={item._id} style={{ border: `1px solid ${COLORS.border}`, borderRadius: '6px', padding: '8px', opacity: item.available ? 1 : 0.6, background: COLORS.neutralLight }}>
                    {editingItem === item._id ? (
                      <>
                        <input value={item.name} onChange={(e) => setItems(items.map(i => i._id === item._id ? { ...i, name: e.target.value } : i))} style={{ width: '100%', padding: '4px', marginBottom: '6px', background: COLORS.neutralDark, border: `1px solid ${COLORS.border}`, borderRadius: '4px', fontSize: '10px', color: COLORS.textPrimary }} />
                        <input type="number" value={item.price} onChange={(e) => setItems(items.map(i => i._id === item._id ? { ...i, price: parseFloat(e.target.value) } : i))} style={{ width: '100%', padding: '4px', marginBottom: '6px', background: COLORS.neutralDark, border: `1px solid ${COLORS.border}`, borderRadius: '4px', fontSize: '10px', color: COLORS.textPrimary }} />
                        <select value={item.category} onChange={(e) => setItems(items.map(i => i._id === item._id ? { ...i, category: e.target.value } : i))} style={{ width: '100%', padding: '4px', marginBottom: '6px', background: COLORS.neutralDark, border: `1px solid ${COLORS.border}`, borderRadius: '4px', fontSize: '10px', color: COLORS.textPrimary }}>
                          {categories.map(cat => (<option key={cat._id} value={cat._id}>{cat.name}</option>))}
                        </select>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button onClick={() => updateItem(item)} style={{ flex: 1, padding: '4px', background: COLORS.success, color: 'white', border: 'none', borderRadius: '4px', fontSize: '9px' }}>Save</button>
                          <button onClick={() => setEditingItem(null)} style={{ flex: 1, padding: '4px', background: COLORS.textMuted, color: 'white', border: 'none', borderRadius: '4px', fontSize: '9px' }}>Cancel</button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '6px' }}>
                          <div><strong style={{ fontSize: '12px', color: COLORS.textPrimary }}>{item.name}</strong><div style={{ fontSize: '9px', color: COLORS.textSecondary }}>{category?.name || 'No Category'}</div></div>
                          <span style={{ fontSize: '13px', fontWeight: 'bold', color: COLORS.success }}>₹{item.price}</span>
                        </div>
                        <div style={{ fontSize: '9px', color: COLORS.textSecondary, marginBottom: '6px' }}>Prep: {item.prepTime || 10} min</div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button onClick={() => setEditingItem(item._id)} style={{ flex: 1, padding: '4px', background: COLORS.primary, color: 'white', border: 'none', borderRadius: '4px', fontSize: '9px' }}>Edit</button>
                          <button onClick={() => deleteItem(item._id, item.name)} style={{ flex: 1, padding: '4px', background: COLORS.danger, color: 'white', border: 'none', borderRadius: '4px', fontSize: '9px' }}>Delete</button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Import/Export Section */}
      {activeTab === 'importexport' && (
        <div>
          <div style={{ background: COLORS.bgCard, borderRadius: '8px', padding: '16px', marginBottom: '16px', border: `1px solid ${COLORS.border}` }}>
            <h3 style={{ fontSize: '14px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: COLORS.textPrimary }}>
              <FiTable size={16} color={COLORS.primary} /> Export Menu as CSV
            </h3>
            <p style={{ fontSize: '11px', color: COLORS.textSecondary, marginBottom: '12px' }}>
              Export menu items to CSV format. Compatible with Excel, Google Sheets.
            </p>
            <button onClick={exportToCSV} disabled={loading} style={{ padding: '8px 16px', background: COLORS.success, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FiDownload size={12} /> Export to CSV
            </button>
          </div>

          <div style={{ background: COLORS.bgCard, borderRadius: '8px', padding: '16px', marginBottom: '16px', border: `1px solid ${COLORS.border}` }}>
            <h3 style={{ fontSize: '14px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: COLORS.textPrimary }}>
              <FiUpload size={16} color={COLORS.primary} /> Import Menu from CSV
            </h3>
            <p style={{ fontSize: '11px', color: COLORS.textSecondary, marginBottom: '12px' }}>
              Import menu items from a CSV file. File should have columns: Name, Price, Category, Prep Time (min), Available
            </p>
            <input type="file" ref={csvImportRef} accept=".csv" onChange={importFromCSV} style={{ marginBottom: '12px', color: COLORS.textPrimary }} />
          </div>

          {/* Progressive Import Progress View */}
          {importProgress > 0 && (
            <div style={{ background: COLORS.bgCard, borderRadius: '8px', padding: '20px', marginBottom: '16px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: importStep === 'complete' ? `${COLORS.success}20` : `${COLORS.primary}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px'
                }}>
                  {importStep === 'complete' ? '✅' : importStep === 'importing_items' ? '📦' : importStep === 'creating_categories' ? '🏷️' : importStep === 'deleting_items' || importStep === 'deleting_categories' ? '🗑️' : <FiLoader className="spinning" size={20} color={COLORS.primary} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '4px', color: COLORS.textPrimary }}>
                    {importStep === 'complete' ? 'Import Complete!' : 'Importing Menu Items...'}
                  </div>
                  <div style={{ fontSize: '11px', color: COLORS.textSecondary }}>{importStatus}</div>
                </div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: COLORS.primary }}>{importProgress}%</div>
              </div>
              
              {/* Progress Bar */}
              <div style={{ height: '8px', background: COLORS.neutralLight, borderRadius: '4px', overflow: 'hidden', marginBottom: '16px' }}>
                <div style={{ width: `${importProgress}%`, height: '100%', background: importStep === 'complete' ? COLORS.success : COLORS.primary, transition: 'width 0.3s ease' }} />
              </div>
              
              {/* Step Details */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
                <div style={{ textAlign: 'center', opacity: importStep === 'deleting_items' || importProgress > 10 ? 1 : 0.5 }}>
                  <div style={{ fontSize: '10px', color: COLORS.textSecondary }}>Step 1</div>
                  <div style={{ fontSize: '11px', fontWeight: '500', color: COLORS.textPrimary }}>Delete Items</div>
                  {importProgress > 10 && <FiCheckCircle size={12} color={COLORS.success} style={{ marginTop: '4px' }} />}
                </div>
                <div style={{ textAlign: 'center', opacity: importStep === 'deleting_categories' || importProgress > 20 ? 1 : 0.5 }}>
                  <div style={{ fontSize: '10px', color: COLORS.textSecondary }}>Step 2</div>
                  <div style={{ fontSize: '11px', fontWeight: '500', color: COLORS.textPrimary }}>Delete Categories</div>
                  {importProgress > 20 && <FiCheckCircle size={12} color={COLORS.success} style={{ marginTop: '4px' }} />}
                </div>
                <div style={{ textAlign: 'center', opacity: importStep === 'creating_categories' || importProgress > 40 ? 1 : 0.5 }}>
                  <div style={{ fontSize: '10px', color: COLORS.textSecondary }}>Step 3</div>
                  <div style={{ fontSize: '11px', fontWeight: '500', color: COLORS.textPrimary }}>Create Categories</div>
                  {importProgress > 40 && importDetails.categoriesCreated > 0 && (
                    <div style={{ fontSize: '9px', color: COLORS.success, marginTop: '2px' }}>{importDetails.categoriesCreated} created</div>
                  )}
                </div>
                <div style={{ textAlign: 'center', opacity: importStep === 'importing_items' || importProgress > 40 ? 1 : 0.5 }}>
                  <div style={{ fontSize: '10px', color: COLORS.textSecondary }}>Step 4</div>
                  <div style={{ fontSize: '11px', fontWeight: '500', color: COLORS.textPrimary }}>Import Items</div>
                  {importDetails.itemsProcessed > 0 && (
                    <div style={{ fontSize: '9px', color: COLORS.success, marginTop: '2px' }}>
                      {importDetails.itemsSuccess}/{importDetails.itemsProcessed}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Live Stats */}
              {(importStep === 'importing_items' || importStep === 'creating_categories') && (
                <div style={{ background: COLORS.neutralLight, borderRadius: '8px', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '10px', color: COLORS.textSecondary }}>Processed:</span>
                    <span style={{ fontSize: '11px', fontWeight: '500', color: COLORS.textPrimary }}>{importDetails.itemsProcessed} / {csvData.length}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '10px', color: COLORS.textSecondary }}>Successfully Imported:</span>
                    <span style={{ fontSize: '11px', fontWeight: '500', color: COLORS.success }}>{importDetails.itemsSuccess}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '10px', color: COLORS.textSecondary }}>Failed:</span>
                    <span style={{ fontSize: '11px', fontWeight: '500', color: COLORS.danger }}>{importDetails.itemsFailed}</span>
                  </div>
                </div>
              )}
              
              {importStep === 'complete' && (
                <div style={{ background: `${COLORS.success}20`, borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                  <FiCheckCircle size={20} color={COLORS.success} style={{ marginBottom: '8px' }} />
                  <div style={{ fontSize: '12px', fontWeight: '500', color: COLORS.success }}>Import Completed Successfully!</div>
                  <div style={{ fontSize: '10px', color: COLORS.textSecondary, marginTop: '4px' }}>
                    {importDetails.itemsSuccess} items imported • {importDetails.categoriesCreated} categories created
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{ background: COLORS.bgCard, borderRadius: '8px', padding: '16px', marginBottom: '16px', border: `1px solid ${COLORS.border}` }}>
            <h3 style={{ fontSize: '14px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: COLORS.textPrimary }}>
              <FiFile size={16} color={COLORS.primary} /> Export as JSON
            </h3>
            <p style={{ fontSize: '11px', color: COLORS.textSecondary, marginBottom: '12px' }}>Export your data to a JSON file for backup or migration.</p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button onClick={() => exportDataToFile('menu')} style={{ padding: '8px 16px', background: COLORS.primary, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FiPackage size={12} /> Export Menu & Categories
              </button>
              <button onClick={() => exportDataToFile('settings')} style={{ padding: '8px 16px', background: COLORS.secondary, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FiSettings size={12} /> Export Settings
              </button>
              <button onClick={() => exportDataToFile('tables')} style={{ padding: '8px 16px', background: COLORS.secondary, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FiUsers size={12} /> Export Tables
              </button>
              <button onClick={() => exportDataToFile('all')} style={{ padding: '8px 16px', background: COLORS.success, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FiDatabase size={12} /> Export All
              </button>
            </div>
          </div>

          <div style={{ background: COLORS.bgCard, borderRadius: '8px', padding: '16px', border: `1px solid ${COLORS.border}` }}>
            <h3 style={{ fontSize: '14px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: COLORS.textPrimary }}>
              <FiUpload size={16} color={COLORS.primary} /> Import from JSON
            </h3>
            <p style={{ fontSize: '11px', color: COLORS.textSecondary, marginBottom: '12px' }}>Import data from a JSON file exported from this system.</p>
            <input type="file" ref={importFileInputRef} accept=".json" onChange={importDataFromFile} style={{ marginBottom: '12px', color: COLORS.textPrimary }} />
          </div>
        </div>
      )}

      {/* CSV Mapping Modal */}
      {showCsvMapping && (
        <>
          <div onClick={() => setShowCsvMapping(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', zIndex: 2000 }} />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '80vh',
            background: COLORS.bgCard,
            borderRadius: '12px',
            overflow: 'hidden',
            zIndex: 2001,
            display: 'flex',
            flexDirection: 'column',
            border: `1px solid ${COLORS.border}`
          }}>
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${COLORS.border}`, background: COLORS.primary, color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '14px', margin: 0 }}>Map CSV Columns</h2>
              <button onClick={() => setShowCsvMapping(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><FiX size={16} /></button>
            </div>
            <div style={{ padding: '16px', overflowY: 'auto' }}>
              <p style={{ fontSize: '11px', color: COLORS.textSecondary, marginBottom: '12px' }}>Map your CSV columns to the correct fields:</p>
              
              <div style={{ marginBottom: '16px', padding: '10px', background: COLORS.neutralLight, borderRadius: '6px', border: `1px solid ${COLORS.border}` }}>
                <p style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '6px', color: COLORS.textPrimary }}>📋 Available Columns in your CSV:</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {csvPreview[0] && Object.keys(csvPreview[0]).map(key => (
                    <span key={key} style={{ fontSize: '8px', background: COLORS.neutralDark, padding: '3px 8px', borderRadius: '12px', color: COLORS.textSecondary, fontFamily: 'monospace' }}>{key}</span>
                  ))}
                </div>
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '11px', fontWeight: '500', display: 'block', marginBottom: '4px', color: COLORS.textPrimary }}>Item Name Column *</label>
                <select value={csvMapping.name} onChange={(e) => setCsvMapping({ ...csvMapping, name: e.target.value })} style={{ width: '100%', padding: '6px', background: COLORS.neutralLight, border: `1px solid ${COLORS.border}`, borderRadius: '4px', fontSize: '11px', color: COLORS.textPrimary }}>
                  <option value="">Select column...</option>
                  {csvPreview[0] && Object.keys(csvPreview[0]).map(key => (<option key={key} value={key}>{key}</option>))}
                </select>
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '11px', fontWeight: '500', display: 'block', marginBottom: '4px', color: COLORS.textPrimary }}>Price Column *</label>
                <select value={csvMapping.price} onChange={(e) => setCsvMapping({ ...csvMapping, price: e.target.value })} style={{ width: '100%', padding: '6px', background: COLORS.neutralLight, border: `1px solid ${COLORS.border}`, borderRadius: '4px', fontSize: '11px', color: COLORS.textPrimary }}>
                  <option value="">Select column...</option>
                  {csvPreview[0] && Object.keys(csvPreview[0]).map(key => (<option key={key} value={key}>{key}</option>))}
                </select>
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '11px', fontWeight: '500', display: 'block', marginBottom: '4px', color: COLORS.textPrimary }}>Category Column</label>
                <select value={csvMapping.category} onChange={(e) => setCsvMapping({ ...csvMapping, category: e.target.value })} style={{ width: '100%', padding: '6px', background: COLORS.neutralLight, border: `1px solid ${COLORS.border}`, borderRadius: '4px', fontSize: '11px', color: COLORS.textPrimary }}>
                  <option value="">Select column...</option>
                  {csvPreview[0] && Object.keys(csvPreview[0]).map(key => (<option key={key} value={key}>{key}</option>))}
                </select>
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '11px', fontWeight: '500', display: 'block', marginBottom: '4px', color: COLORS.textPrimary }}>Prep Time Column (optional)</label>
                <select value={csvMapping.prepTime} onChange={(e) => setCsvMapping({ ...csvMapping, prepTime: e.target.value })} style={{ width: '100%', padding: '6px', background: COLORS.neutralLight, border: `1px solid ${COLORS.border}`, borderRadius: '4px', fontSize: '11px', color: COLORS.textPrimary }}>
                  <option value="">None</option>
                  {csvPreview[0] && Object.keys(csvPreview[0]).map(key => (<option key={key} value={key}>{key}</option>))}
                </select>
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '11px', fontWeight: '500', display: 'block', marginBottom: '4px', color: COLORS.textPrimary }}>Available Column (optional)</label>
                <select value={csvMapping.available} onChange={(e) => setCsvMapping({ ...csvMapping, available: e.target.value })} style={{ width: '100%', padding: '6px', background: COLORS.neutralLight, border: `1px solid ${COLORS.border}`, borderRadius: '4px', fontSize: '11px', color: COLORS.textPrimary }}>
                  <option value="">None</option>
                  {csvPreview[0] && Object.keys(csvPreview[0]).map(key => (<option key={key} value={key}>{key}</option>))}
                </select>
              </div>
              
              <h4 style={{ fontSize: '11px', fontWeight: '600', marginBottom: '8px', color: COLORS.textPrimary }}>Preview (first 5 rows):</h4>
              <div style={{ overflowX: 'auto', fontSize: '9px', border: `1px solid ${COLORS.border}`, borderRadius: '4px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: COLORS.neutralLight }}>
                      {csvPreview[0] && Object.keys(csvPreview[0]).map(key => (<th key={key} style={{ padding: '4px', border: `1px solid ${COLORS.border}`, textAlign: 'left', color: COLORS.textPrimary }}>{key}</th>))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvPreview.map((row, idx) => (
                      <tr key={idx}>
                        {Object.values(row).map((val, valIdx) => (<td key={valIdx} style={{ padding: '4px', border: `1px solid ${COLORS.border}`, color: COLORS.textSecondary }}>{val}</td>))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div style={{ padding: '12px 16px', borderTop: `1px solid ${COLORS.border}`, display: 'flex', gap: '8px' }}>
              <button onClick={() => setShowCsvMapping(false)} style={{ flex: 1, padding: '8px', background: COLORS.textMuted, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}>Cancel</button>
              <button onClick={processCSVImport} disabled={loading} style={{ flex: 2, padding: '8px', background: COLORS.success, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '500', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                {loading ? <><FiLoader className="spinning" size={12} /> Importing...</> : 'Import Items'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Backup Section */}
      {activeTab === 'backup' && (
        <div>
          <div style={{ background: COLORS.bgCard, borderRadius: '8px', padding: '16px', marginBottom: '16px', border: `1px solid ${COLORS.border}` }}>
            <h3 style={{ fontSize: '14px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: COLORS.textPrimary }}>
              <FiArchive size={16} color={COLORS.primary} /> Create Backup
            </h3>
            <p style={{ fontSize: '11px', color: COLORS.textSecondary, marginBottom: '12px' }}>Create a complete backup of all your data (menu, categories, tables, settings).</p>
            <button onClick={createBackup} disabled={loading} style={{ padding: '8px 16px', background: COLORS.success, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FiRefreshCw size={12} /> Create New Backup
            </button>
          </div>

          <div style={{ background: COLORS.bgCard, borderRadius: '8px', padding: '16px', border: `1px solid ${COLORS.border}` }}>
            <h3 style={{ fontSize: '14px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: COLORS.textPrimary }}>
              <FiHardDrive size={16} color={COLORS.primary} /> Backup History ({backupList.length})
            </h3>
            {backupList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: COLORS.textSecondary, fontSize: '11px' }}>No backups found. Create your first backup.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {backupList.map(backup => (
                  <div key={backup.id} style={{ border: `1px solid ${COLORS.border}`, borderRadius: '8px', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', background: COLORS.neutralLight }}>
                    <div><div style={{ fontWeight: 'bold', fontSize: '11px', color: COLORS.textPrimary }}>{new Date(backup.date).toLocaleString()}</div><div style={{ fontSize: '9px', color: COLORS.textSecondary }}>Size: {formatFileSize(backup.size)}</div></div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => restoreBackup(backup)} style={{ padding: '4px 10px', background: COLORS.primary, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }}>Restore</button>
                      <button onClick={() => downloadBackup(backup)} style={{ padding: '4px 10px', background: COLORS.secondary, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }}>Download</button>
                      <button onClick={() => deleteBackup(backup.id)} style={{ padding: '4px 10px', background: COLORS.danger, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* General Settings */}
      {activeTab === 'general' && (
        <div style={{ background: COLORS.bgCard, borderRadius: '8px', padding: '16px', border: `1px solid ${COLORS.border}` }}>
          <h3 style={{ fontSize: '14px', marginBottom: '16px', color: COLORS.textPrimary }}>General Settings</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${COLORS.border}` }}>
              <span style={{ fontSize: '12px', color: COLORS.textPrimary }}>Tax Rate (%)</span>
              <input type="number" value={generalSettings.taxRate} onChange={(e) => setGeneralSettings({ ...generalSettings, taxRate: parseFloat(e.target.value) })} style={{ width: '70px', padding: '4px', background: COLORS.neutralLight, border: `1px solid ${COLORS.border}`, borderRadius: '4px', fontSize: '12px', color: COLORS.textPrimary }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${COLORS.border}` }}>
              <span style={{ fontSize: '12px', color: COLORS.textPrimary }}>Service Charge (%)</span>
              <input type="number" value={generalSettings.serviceCharge} onChange={(e) => setGeneralSettings({ ...generalSettings, serviceCharge: parseFloat(e.target.value) })} style={{ width: '70px', padding: '4px', background: COLORS.neutralLight, border: `1px solid ${COLORS.border}`, borderRadius: '4px', fontSize: '12px', color: COLORS.textPrimary }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${COLORS.border}` }}>
              <span style={{ fontSize: '12px', color: COLORS.textPrimary }}>Kitchen Print on Order</span>
              <input type="checkbox" checked={generalSettings.kitchenPrint} onChange={(e) => setGeneralSettings({ ...generalSettings, kitchenPrint: e.target.checked })} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${COLORS.border}` }}>
              <span style={{ fontSize: '12px', color: COLORS.textPrimary }}>Auto Accept Orders</span>
              <input type="checkbox" checked={generalSettings.autoAcceptOrders} onChange={(e) => setGeneralSettings({ ...generalSettings, autoAcceptOrders: e.target.checked })} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${COLORS.border}` }}>
              <span style={{ fontSize: '12px', color: COLORS.textPrimary }}>Sound Effects</span>
              <input type="checkbox" checked={generalSettings.soundEnabled} onChange={(e) => setGeneralSettings({ ...generalSettings, soundEnabled: e.target.checked })} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${COLORS.border}` }}>
              <span style={{ fontSize: '12px', color: COLORS.textPrimary }}>Theme</span>
              <select value={generalSettings.theme} onChange={(e) => setGeneralSettings({ ...generalSettings, theme: e.target.value })} style={{ padding: '4px', background: COLORS.neutralLight, border: `1px solid ${COLORS.border}`, borderRadius: '4px', fontSize: '12px', color: COLORS.textPrimary }}>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
            <button onClick={saveGeneralSettings} disabled={loading} style={{ marginTop: '12px', padding: '8px', background: COLORS.success, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <FiSave size={12} /> Save Settings
            </button>
          </div>
        </div>
      )}

      {/* Notifications Section */}
      {activeTab === 'notifications' && (
        <NotificationSettings />
      )}
      
      {/* User Management */}
      {activeTab === 'users' && (
        <UserManagement currentUser={user} />
      )}
      
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spinning {
          animation: spin 1s linear infinite;
        }
        
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        
        ::-webkit-scrollbar-track {
          background: ${COLORS.neutralLight};
          border-radius: 3px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: ${COLORS.primary};
          border-radius: 3px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: ${COLORS.secondary};
        }
        
        input, select, textarea {
          outline: none;
        }
        
        input:focus, select:focus, textarea:focus {
          border-color: ${COLORS.primary} !important;
          box-shadow: 0 0 0 2px ${COLORS.primary}20;
        }
      `}</style>
    </div>
  );
}

export default Settings;