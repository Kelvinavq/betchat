export const BUBBLE_ICONS = [
  { id: 'ChatOutlined',              label: 'Chat'       },
  { id: 'ChatBubbleOutlineOutlined', label: 'Burbuja'    },
  { id: 'SupportAgent',              label: 'Soporte'    },
  { id: 'Forum',                     label: 'Foro'       },
  { id: 'MessageOutlined',           label: 'Mensaje'    },
  { id: 'HelpOutline',               label: 'Ayuda'      },
  { id: 'QuestionAnswerOutlined',    label: 'Q&A'        },
  { id: 'PhoneOutlined',             label: 'Telefono'   },
  { id: 'HeadsetMicOutlined',        label: 'Auricular'  },
  { id: 'LiveHelp',                  label: 'Asistencia' },
  { id: 'ContactSupportOutlined',    label: 'Contacto'   },
  { id: 'SmartToyOutlined',          label: 'Bot'        },
]

export const DEFAULT_BUBBLE_CONFIG = {
  style:   'default',
  default: { text: '',                  icon: 'ChatOutlined'              },
  open:    { text: 'Chatear',           icon: 'ChatBubbleOutlineOutlined' },
  wide:    { text: 'Necesitas ayuda?',  icon: 'SupportAgent'              },
  minimal: { text: '',                  icon: 'ChatOutlined'              },
}
