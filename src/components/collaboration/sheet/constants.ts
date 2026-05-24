import { 
    Type, 
    AlignLeft, 
    Hash, 
    CalendarDays, 
    CheckSquare, 
    ChevronDown, 
    Layers, 
    Image as ImageIcon, 
    Mail, 
    Phone, 
    Globe, 
    UserCircle, 
    DollarSign, 
    Settings2, 
    FileText, 
    Grid, 
    Layout, 
    ListFilter, 
    BetweenVerticalStart, 
    BetweenVerticalEnd, 
    Maximize, 
    StretchVertical,
    Calendar as CalendarIcon
} from 'lucide-react';
import { SheetFieldType, SheetViewType, RowHeight } from '@/lib/types';

export const FIELD_ICONS: Record<SheetFieldType, React.ElementType> = {
    text: Type,
    longtext: AlignLeft,
    number: Hash,
    date: CalendarDays,
    checkbox: CheckSquare,
    select: ChevronDown,
    multiselect: Layers,
    attachment: ImageIcon,
    email: Mail,
    phone: Phone,
    url: Globe,
    user: UserCircle,
    currency: DollarSign,
    status: Settings2,
    formula: FileText
};

export const VIEW_ICONS: Record<SheetViewType, React.ElementType> = {
    grid: Grid,
    kanban: Layout,
    calendar: CalendarIcon,
    list: ListFilter
};

export const FIELD_TYPES: { type: SheetFieldType, label: string }[] = [
    { type: 'text', label: 'Single line text' },
    { type: 'longtext', label: 'Multi-line text' },
    { type: 'number', label: 'Number' },
    { type: 'currency', label: 'Currency' },
    { type: 'date', label: 'Date' },
    { type: 'checkbox', label: 'Checkbox' },
    { type: 'select', label: 'Single select' },
    { type: 'status', label: 'Status' },
    { type: 'email', label: 'Email' },
    { type: 'url', label: 'URL' },
    { type: 'phone', label: 'Phone' },
];

export const CURRENCY_SYMBOLS = ['₱', '$', '€', '£', '¥', '₩', '₹'];

export const ROW_HEIGHT_OPTIONS: { id: RowHeight, label: string, icon: React.ElementType }[] = [
    { id: 'short', label: 'Short', icon: BetweenVerticalStart },
    { id: 'medium', label: 'Medium', icon: BetweenVerticalEnd },
    { id: 'tall', icon: Maximize, label: 'Tall' },
    { id: 'extra-tall', icon: StretchVertical, label: 'Extra Tall' }
];

export const OPTION_COLORS = [
    // Subtle Row
    { value: 'bg-blue-50 text-blue-700' }, { value: 'bg-sky-50 text-sky-700' }, { value: 'bg-cyan-50 text-cyan-700' }, { value: 'bg-teal-50 text-teal-700' }, { value: 'bg-green-50 text-green-700' }, { value: 'bg-yellow-50 text-yellow-700' }, { value: 'bg-orange-50 text-orange-700' }, { value: 'bg-red-50 text-red-700' }, { value: 'bg-pink-50 text-pink-700' }, { value: 'bg-purple-50 text-purple-700' }, { value: 'bg-slate-100 text-slate-700' },
    // Light Row
    { value: 'bg-blue-100 text-blue-800' }, { value: 'bg-sky-100 text-sky-800' }, { value: 'bg-cyan-100 text-cyan-800' }, { value: 'bg-teal-100 text-teal-800' }, { value: 'bg-green-100 text-green-800' }, { value: 'bg-yellow-100 text-yellow-800' }, { value: 'bg-orange-100 text-orange-800' }, { value: 'bg-red-100 text-red-800' }, { value: 'bg-pink-100 text-pink-800' }, { value: 'bg-purple-100 text-purple-800' }, { value: 'bg-slate-200 text-slate-900' },
    // Solid Row
    { value: 'bg-blue-600 text-white' }, { value: 'bg-sky-600 text-white' }, { value: 'bg-cyan-600 text-white' }, { value: 'bg-teal-600 text-white' }, { value: 'bg-green-600 text-white' }, { value: 'bg-yellow-500 text-white' }, { value: 'bg-orange-600 text-white' }, { value: 'bg-red-600 text-white' }, { value: 'bg-pink-600 text-white' }, { value: 'bg-purple-600 text-white' }, { value: 'bg-slate-600 text-white' },
    // Deep Row
    { value: 'bg-blue-800 text-white' }, { value: 'bg-sky-800 text-white' }, { value: 'bg-cyan-800 text-white' }, { value: 'bg-teal-800 text-white' }, { value: 'bg-green-800 text-white' }, { value: 'bg-yellow-700 text-white' }, { value: 'bg-orange-800 text-white' }, { value: 'bg-red-800 text-white' }, { value: 'bg-pink-800 text-white' }, { value: 'bg-purple-800 text-white' }, { value: 'bg-slate-800 text-white' },
];
