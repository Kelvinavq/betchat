import ChatOutlinedIcon from '@mui/icons-material/ChatOutlined'
import ChatBubbleOutlineOutlinedIcon from '@mui/icons-material/ChatBubbleOutlineOutlined'
import SupportAgentIcon from '@mui/icons-material/SupportAgent'
import ForumIcon from '@mui/icons-material/Forum'
import MessageOutlinedIcon from '@mui/icons-material/MessageOutlined'
import HelpOutlinedIcon from '@mui/icons-material/HelpOutlined'
import QuestionAnswerOutlinedIcon from '@mui/icons-material/QuestionAnswerOutlined'
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined'
import HeadsetMicOutlinedIcon from '@mui/icons-material/HeadsetMicOutlined'
import LiveHelpIcon from '@mui/icons-material/LiveHelp'
import ContactSupportOutlinedIcon from '@mui/icons-material/ContactSupportOutlined'
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined'

export const BUBBLE_ICONS = [
  { id: 'ChatOutlined',              label: 'Chat'       },
  { id: 'ChatBubbleOutlineOutlined', label: 'Burbuja'    },
  { id: 'SupportAgent',              label: 'Soporte'    },
  { id: 'Forum',                     label: 'Foro'       },
  { id: 'MessageOutlined',           label: 'Mensaje'    },
  { id: 'HelpOutline',               label: 'Ayuda'      },
  { id: 'QuestionAnswerOutlined',    label: 'Q&A'        },
  { id: 'PhoneOutlined',             label: 'Teléfono'   },
  { id: 'HeadsetMicOutlined',        label: 'Auricular'  },
  { id: 'LiveHelp',                  label: 'Asistencia' },
  { id: 'ContactSupportOutlined',    label: 'Contacto'   },
  { id: 'SmartToyOutlined',          label: 'Bot'        },
]

export const ICON_MAP = {
  ChatOutlined:              ChatOutlinedIcon,
  ChatBubbleOutlineOutlined: ChatBubbleOutlineOutlinedIcon,
  SupportAgent:              SupportAgentIcon,
  Forum:                     ForumIcon,
  MessageOutlined:           MessageOutlinedIcon,
  HelpOutline:               HelpOutlinedIcon,
  QuestionAnswerOutlined:    QuestionAnswerOutlinedIcon,
  PhoneOutlined:             PhoneOutlinedIcon,
  HeadsetMicOutlined:        HeadsetMicOutlinedIcon,
  LiveHelp:                  LiveHelpIcon,
  ContactSupportOutlined:    ContactSupportOutlinedIcon,
  SmartToyOutlined:          SmartToyOutlinedIcon,
}

export const DEFAULT_BUBBLE_CONFIG = {
  style:   'default',
  default: { text: '',                  icon: 'ChatOutlined'              },
  open:    { text: 'Chatear',           icon: 'ChatBubbleOutlineOutlined' },
  wide:    { text: '¿Necesitas ayuda?', icon: 'SupportAgent'              },
  minimal: { text: '',                  icon: 'ChatOutlined'              },
}
