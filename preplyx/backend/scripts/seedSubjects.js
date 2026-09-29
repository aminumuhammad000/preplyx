"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var mongoose_1 = __importDefault(require("mongoose"));
var dotenv_1 = __importDefault(require("dotenv"));
var Subject_1 = __importDefault(require("../src/models/Subject"));
dotenv_1.default.config();
var SUBJECT_CATEGORIES = {
    'Mathematics': ['Science', 'Art', 'Commerce'],
    'English Language': ['Science', 'Art', 'Commerce'],
    'Physics': ['Science'],
    'Chemistry': ['Science'],
    'Biology': ['Science'],
    'Agricultural Science': ['Science', 'Vocational'],
    'Economics': ['Commerce', 'Art'],
    'Government': ['Art'],
    'Civic Education': ['Art', 'Commerce'],
    'Literature in English': ['Art'],
    'Accounting': ['Commerce'],
    'Commerce': ['Commerce'],
    'Geography': ['Science', 'Art'],
    'History': ['Art'],
    'Christian Religious Studies': ['Art'],
    'Islamic Religious Studies': ['Art'],
    'Computer Studies': ['Science', 'Vocational'],
    'Further Mathematics': ['Science'],
    'French': ['Language', 'Art'],
    'Arabic': ['Language', 'Art'],
    'Yoruba': ['Language', 'Art'],
    'Igbo': ['Language', 'Art'],
    'Hausa': ['Language', 'Art'],
    'Music': ['Art'],
    'Art': ['Art', 'Vocational'],
    'Physical Education': ['Vocational'],
    'Office Practice': ['Commerce', 'Vocational'],
    'Insurance': ['Commerce'],
    'Principles of Management': ['Commerce'],
    'Business Management': ['Commerce'],
    'Food and Nutrition': ['Vocational'],
    'Clothing and Textile': ['Vocational'],
    'Home Management': ['Vocational'],
    'Technical Drawing': ['Vocational'],
    'Metalwork': ['Vocational'],
    'Woodwork': ['Vocational'],
    'Electronics': ['Vocational'],
    'Auto Mechanics': ['Vocational'],
    'Basic Electricity': ['Vocational'],
    'Applied Electricity': ['Vocational'],
    'Shorthand': ['Commerce', 'Vocational'],
    'Typewriting': ['Commerce', 'Vocational'],
    'Bookkeeping': ['Commerce'],
    'Salesmanship': ['Commerce']
};
var SUBJECT_ICONS = {
    Mathematics: 'Calculator',
    'English Language': 'BookType',
    Physics: 'Zap',
    Chemistry: 'FlaskConical',
    Biology: 'Leaf',
    Economics: 'BarChart3',
    Government: 'Landmark',
    'Civic Education': 'Vote',
    'Agricultural Science': 'Sprout',
    'Literature in English': 'BookText',
    Accounting: 'Briefcase',
    Commerce: 'ShoppingCart',
    Geography: 'Globe',
    History: 'Scroll',
    'Christian Religious Studies': 'Cross',
    'Islamic Religious Studies': 'Building2',
    'Computer Studies': 'Monitor',
    'Further Mathematics': 'Calculator',
    French: 'Globe',
    Arabic: 'Globe',
    Yoruba: 'Globe',
    Igbo: 'Globe',
    Hausa: 'Globe',
    Music: 'Music',
    Art: 'Palette',
    'Physical Education': 'Activity',
    'Office Practice': 'Briefcase',
    Insurance: 'Shield',
    'Principles of Management': 'Users',
    'Business Management': 'Briefcase',
    'Food and Nutrition': 'Apple',
    'Clothing and Textile': 'Shirt',
    'Home Management': 'Home',
    'Technical Drawing': 'PenTool',
    Metalwork: 'Hammer',
    Woodwork: 'Hammer',
    Electronics: 'Cpu',
    'Auto Mechanics': 'Wrench',
    'Basic Electricity': 'Zap',
    'Applied Electricity': 'Zap',
    Shorthand: 'Pen',
    Typewriting: 'Keyboard',
    Bookkeeping: 'Book',
    Salesmanship: 'TrendingUp'
};
var SUBJECT_TIPS = {
    Mathematics: 'Algebra, Sequences, Statistics',
    'English Language': 'Comprehension, Grammar, Vocabulary',
    Physics: 'Mechanics, Waves, Electromagnetism',
    Chemistry: 'Organic, Inorganic, Physical Chem',
    Biology: 'Genetics, Ecology, Cell Biology',
    'Agricultural Science': 'Crops, Livestock, Soil Science',
    Economics: 'Micro, Macro, Trade & Policy',
    Government: 'Constitution, Governance, Politics',
    'Civic Education': 'Rights, Duties, Citizenship',
    'Literature in English': 'Prose, Poetry, Drama, Figures of Speech',
    Accounting: 'Ledgers, Balance Sheets, Financials',
    Commerce: 'Trade, Finance, Business Organizations',
    Geography: 'Physical, Human, Regional Geography',
    History: 'Nigeria, Africa, World History',
    'Christian Religious Studies': 'Bible, Christian Teachings',
    'Islamic Religious Studies': 'Quran, Islamic Teachings',
    'Computer Studies': 'Programming, Hardware, Networks',
    'Further Mathematics': 'Calculus, Mechanics, Statistics',
    French: 'Grammar, Vocabulary, Comprehension',
    Arabic: 'Grammar, Vocabulary, Comprehension',
    Yoruba: 'Grammar, Literature, Culture',
    Igbo: 'Grammar, Literature, Culture',
    Hausa: 'Grammar, Literature, Culture',
    Music: 'Theory, Practical, History',
    Art: 'Drawing, Painting, Art History',
    'Physical Education': 'Sports, Health, Fitness',
    'Office Practice': 'Secretariat, Administration',
    Insurance: 'Risk, Policies, Claims',
    'Principles of Management': 'Planning, Organizing, Control',
    'Business Management': 'Organization, Strategy, Operations',
    'Food and Nutrition': 'Food Science, Dietetics',
    'Clothing and Textile': 'Fabrics, Design, Production',
    'Home Management': 'Family Resources, Housing',
    'Technical Drawing': 'Engineering, Architectural Drawing',
    Metalwork: 'Fabrication, Welding, Machining',
    Woodwork: 'Carpentry, Joinery, Finishing',
    Electronics: 'Circuits, Devices, Systems',
    'Auto Mechanics': 'Engine, Transmission, Systems',
    'Basic Electricity': 'Circuits, Components, Safety',
    'Applied Electricity': 'Installation, Maintenance',
    Shorthand: 'Speedwriting, Transcription',
    Typewriting: 'Keyboard Skills, Document Production',
    Bookkeeping: 'Recording, Classifying, Summarizing',
    Salesmanship: 'Selling Techniques, Customer Service'
};
function seed() {
    return __awaiter(this, void 0, void 0, function () {
        var names, created, updated, _i, names_1, name_1, categories, icon, tips, existing;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, mongoose_1.default.connect('mongodb://localhost:27017/cbt')];
                case 1:
                    _a.sent();
                    console.log('Connected to MongoDB');
                    names = Object.keys(SUBJECT_CATEGORIES);
                    created = 0;
                    updated = 0;
                    _i = 0, names_1 = names;
                    _a.label = 2;
                case 2:
                    if (!(_i < names_1.length)) return [3 /*break*/, 8];
                    name_1 = names_1[_i];
                    categories = SUBJECT_CATEGORIES[name_1] || [];
                    icon = SUBJECT_ICONS[name_1] || 'BookOpen';
                    tips = SUBJECT_TIPS[name_1] || '';
                    return [4 /*yield*/, Subject_1.default.findOne({ name: name_1 })];
                case 3:
                    existing = _a.sent();
                    if (!existing) return [3 /*break*/, 5];
                    existing.categories = categories;
                    existing.icon = icon;
                    existing.tips = tips;
                    return [4 /*yield*/, existing.save()];
                case 4:
                    _a.sent();
                    updated++;
                    return [3 /*break*/, 7];
                case 5: return [4 /*yield*/, Subject_1.default.create({
                        name: name_1,
                        categories: categories,
                        icon: icon,
                        tips: tips
                    })];
                case 6:
                    _a.sent();
                    created++;
                    _a.label = 7;
                case 7:
                    _i++;
                    return [3 /*break*/, 2];
                case 8:
                    console.log("Created ".concat(created, " subjects, updated ").concat(updated, " subjects."));
                    process.exit(0);
                    return [2 /*return*/];
            }
        });
    });
}
seed();
