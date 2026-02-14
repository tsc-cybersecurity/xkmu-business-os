import {
  Building,
  Building2,
  Users,
  TrendingUp,
  Bot,
  Package,
  Zap,
  Shield,
  Globe,
  ArrowRight,
  Monitor,
  Lightbulb,
  FileText,
  Lock,
  Cloud,
  Server,
  Database,
  Code,
  Cpu,
  Wifi,
  Mail,
  Phone,
  MapPin,
  Clock,
  CheckCircle,
  Star,
  Heart,
  Settings,
  Search,
  Eye,
  Newspaper,
  type LucideIcon,
} from 'lucide-react'

const iconMap: Record<string, LucideIcon> = {
  Building,
  Building2,
  Users,
  TrendingUp,
  Bot,
  Package,
  Zap,
  Shield,
  Globe,
  ArrowRight,
  Monitor,
  Lightbulb,
  FileText,
  Lock,
  Cloud,
  Server,
  Database,
  Code,
  Cpu,
  Wifi,
  Mail,
  Phone,
  MapPin,
  Clock,
  CheckCircle,
  Star,
  Heart,
  Settings,
  Search,
  Eye,
  Newspaper,
}

export function getIcon(name: string): LucideIcon | null {
  return iconMap[name] || null
}

export function getIconNames(): string[] {
  return Object.keys(iconMap)
}

export { iconMap }
