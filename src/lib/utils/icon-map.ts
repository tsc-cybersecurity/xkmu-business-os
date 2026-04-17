import { Activity, AlertTriangle, Archive, ArrowRight, Award,
  BarChart, BarChart3, Bell, Bolt, Book, BookOpen, Bot, Box, Briefcase, Bug, Building, Building2,
  Calendar, Camera, CheckCircle, CheckCircle2, ChevronRight, Clipboard, ClipboardCheck, Clock, Cloud, Code, Code2, Cog, Cpu, CreditCard,
  Database, DollarSign, Download,
  Edit, ExternalLink, Eye,
  FileCheck, FileText, Filter, Flag, Flame, Folder, FolderOpen,
  Gauge, Gift, Globe, GraduationCap, Grid,
  HardDrive, Heart, HelpCircle, Home,
  Image, Inbox, Info,
  Key,
  Laptop, Layers, Layout, LayoutTemplate, Lightbulb, Link, List, Lock, LogIn,
  Mail, Map, MapPin, Megaphone, MessageCircle, MessageSquare, Monitor, Moon, MousePointer,
  Network, Newspaper,
  Package, Palette, PenTool, Phone, PieChart, Play, Plug, Plus, Printer,
  Radio, Repeat, Rocket, RotateCcw, Rss,
  Save, Scale, Search, Send, Server, Settings, Share2, Shield, ShieldCheck, ShoppingBag, ShoppingCart, Smartphone, Sparkles, Speaker, Star, Sun,
  Table, Tag, Target, Terminal, ThumbsUp, Timer, Trash2, TrendingUp, Trophy, Truck,
  Umbrella, Upload, User, Users,
  Video, Volume2,
  Wallet, Wand2, Wifi, Wrench,
  Zap, ZoomIn,
  type LucideIcon,
} from 'lucide-react'

const iconMap: Record<string, LucideIcon> = {
  Activity, AlertTriangle, Archive, ArrowRight, Award,
  BarChart, BarChart3, Bell, Bolt, Book, BookOpen, Bot, Box, Briefcase, Bug, Building, Building2,
  Calendar, Camera, CheckCircle, CheckCircle2, ChevronRight, Clipboard, ClipboardCheck, Clock, Cloud, Code, Code2, Cog, Cpu, CreditCard,
  Database, DollarSign, Download,
  Edit, ExternalLink, Eye,
  FileCheck, FileText, Filter, Flag, Flame, Folder, FolderOpen,
  Gauge, Gift, Globe, GraduationCap, Grid,
  HardDrive, Heart, HelpCircle, Home,
  Image, Inbox, Info,
  Key,
  Laptop, Layers, Layout, LayoutTemplate, Lightbulb, Link, List, Lock, LogIn,
  Mail, Map, MapPin, Megaphone, MessageCircle, MessageSquare, Monitor, Moon, MousePointer,
  Network, Newspaper,
  Package, Palette, PenTool, Phone, PieChart, Play, Plug, Plus, Printer,
  Radio, Repeat, Rocket, RotateCcw, Rss,
  Save, Scale, Search, Send, Server, Settings, Share2, Shield, ShieldCheck, ShoppingBag, ShoppingCart, Smartphone, Sparkles, Speaker, Star, Sun,
  Table, Tag, Target, Terminal, ThumbsUp, Timer, Trash2, TrendingUp, Trophy, Truck,
  Umbrella, Upload, User, Users,
  Video, Volume2,
  Wallet, Wand2, Wifi, Wrench,
  Zap, ZoomIn,
}

export function getIcon(name: string): LucideIcon | null {
  return iconMap[name] || null
}

export function getIconNames(): string[] {
  return Object.keys(iconMap).sort()
}

export { iconMap }
