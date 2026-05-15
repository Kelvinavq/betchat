import styled, { css, keyframes } from 'styled-components'

// ─── Design Tokens ───────────────────────────────────────────────────────────
// Page bg:       #06091a
// Card bg:       #0c1424
// Input bg:      #080f1e
// Border:        rgba(255,255,255,0.07)
// Focus border:  rgba(59,130,246,0.5)
// Accent:        #3b82f6
// Accent hover:  #2563eb
// Success:       #10b981
// Danger:        #ef4444
// Warning:       #f59e0b
// Text1:         #f1f5f9
// Text2:         #94a3b8
// Text3:         rgba(148,163,184,0.5)

// ─── Keyframes ───────────────────────────────────────────────────────────────

export const GlobalPulse = keyframes`
  0%   { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.5); }
  70%  { box-shadow: 0 0 0 5px rgba(16, 185, 129, 0); }
  100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
`

// ─── Layout ──────────────────────────────────────────────────────────────────

export const PageWrap = styled.div`
  flex: 1;
  min-width: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #06091a;
  color: #f1f5f9;
  overflow: hidden;
`

export const ScrollArea = styled.div`
  flex: 1;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.08);
    border-radius: 2px;
  }
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.08) transparent;
`

export const PageHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 24px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
`

export const HeaderLeft = styled.div`
  flex: 1;
`

export const HeaderTitle = styled.h1`
  font-size: 22px;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0;
`

export const HeaderSubtitle = styled.p`
  font-size: 13px;
  color: #94a3b8;
  margin: 4px 0 0;
`

export const MenuBtn = styled.button`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #94a3b8;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.15s, color 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #f1f5f9;
  }
`

// ─── Tabs ─────────────────────────────────────────────────────────────────────

export const TabBar = styled.div`
  display: flex;
  gap: 4px;
  padding: 12px 24px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  overflow-x: auto;

  &::-webkit-scrollbar {
    display: none;
  }
  scrollbar-width: none;
`

export const TabBtn = styled.button`
  flex-shrink: 0;
  padding: 8px 14px;
  border-radius: 8px 8px 0 0;
  border: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: background 0.15s, color 0.15s;
  background: transparent;
  color: #94a3b8;

  ${({ $active }) =>
    $active &&
    css`
      background: #0c1424;
      color: #f1f5f9;
      box-shadow: inset 0 -2px 0 #3b82f6;
    `}

  &:hover {
    color: #cbd5e1;
    background: rgba(255, 255, 255, 0.04);
  }
`

export const SubTabBar = styled.div`
  display: flex;
  gap: 4px;
  padding: 10px 24px;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
`

export const SubTabBtn = styled.button`
  padding: 6px 14px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: background 0.15s, color 0.15s, border-color 0.15s;

  ${({ $active }) =>
    $active
      ? css`
          background: rgba(59, 130, 246, 0.15);
          color: #93c5fd;
          border: 1px solid rgba(59, 130, 246, 0.25);
        `
      : css`
          background: transparent;
          color: #94a3b8;
          border: 1px solid transparent;
        `}

  &:hover {
    background: rgba(59, 130, 246, 0.1);
    color: #93c5fd;
  }
`

// ─── Content ──────────────────────────────────────────────────────────────────

export const ContentWrap = styled.div`
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`

export const Split = styled.div`
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 20px;
  align-items: start;

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
`

export const FormSide = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

export const PreviewSide = styled.div`
  position: sticky;
  top: 20px;

  @media (max-width: 1100px) {
    position: static;
  }
`

// ─── Cards ────────────────────────────────────────────────────────────────────

export const Card = styled.div`
  background: #0c1424;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 16px;
  padding: 20px;
`

export const CardTitle = styled.h3`
  font-size: 15px;
  font-weight: 600;
  color: #f1f5f9;
  margin: 0 0 4px;
`

export const CardDesc = styled.p`
  font-size: 12px;
  color: #94a3b8;
  margin: 0 0 16px;
  line-height: 1.5;
`

// ─── Form Fields ──────────────────────────────────────────────────────────────

export const FieldGrid = styled.div`
  display: grid;
  gap: 14px;
  grid-template-columns: ${({ $cols }) =>
    $cols === 3 ? 'repeat(3, minmax(0, 1fr))' : 'repeat(2, minmax(0, 1fr))'};

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`

export const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

export const Label = styled.label`
  font-size: 11px;
  font-weight: 500;
  color: #94a3b8;
  letter-spacing: 0.04em;
  text-transform: uppercase;
`

const inputBase = css`
  background: #080f1e;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 10px;
  color: #f1f5f9;
  padding: 10px 13px;
  font-size: 13px;
  outline: none;
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.15s, box-shadow 0.15s;

  &:focus {
    border: 1px solid rgba(59, 130, 246, 0.5);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &::placeholder {
    color: rgba(148, 163, 184, 0.4);
  }
`

export const Input = styled.input`
  ${inputBase}
`

export const Textarea = styled.textarea`
  ${inputBase}
  min-height: 88px;
  resize: vertical;
  font-family: inherit;
`

export const Select = styled.select`
  ${inputBase}
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 13px center;
  padding-right: 36px;
`

export const ColorInput = styled.input.attrs({ type: 'color' })`
  height: 40px;
  width: 100%;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  padding: 2px;
  cursor: pointer;
  background: #080f1e;
  box-sizing: border-box;
`

export const RangeInput = styled.input.attrs({ type: 'range' })`
  width: 100%;
  accent-color: #3b82f6;
  height: 4px;
  cursor: pointer;
`

// ─── Dynamic Lists ────────────────────────────────────────────────────────────

export const ListRow = styled.div`
  display: grid;
  grid-template-columns: ${({ $cols }) => $cols || '1fr'};
  gap: 8px;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
`

export const AddRowBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 8px;
  color: #60a5fa;
  font-size: 13px;
  cursor: pointer;
  width: fit-content;
  transition: background 0.15s, border-color 0.15s;

  &:hover {
    background: rgba(59, 130, 246, 0.14);
    border-color: rgba(59, 130, 246, 0.35);
  }
`

export const DeleteRowBtn = styled.button`
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.15);
  color: #f87171;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.15s, border-color 0.15s;

  &:hover {
    background: rgba(239, 68, 68, 0.18);
    border-color: rgba(239, 68, 68, 0.3);
  }
`

export const ProbTotal = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  font-size: 12px;
`

export const ProbBar = styled.div`
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.1);
  flex: 1;
  overflow: hidden;
`

export const ProbFill = styled.div`
  height: 100%;
  border-radius: 2px;
  transition: width 0.2s;
  background: ${({ $ok }) => ($ok ? '#10b981' : '#ef4444')};
`

export const ProbLabel = styled.span`
  font-weight: 600;
  color: ${({ $ok }) => ($ok ? '#10b981' : '#ef4444')};
`

// ─── Preview ──────────────────────────────────────────────────────────────────

export const PreviewFrame = styled.div`
  background: radial-gradient(circle at 30% 20%, rgba(59, 130, 246, 0.1), transparent 50%), #080f1e;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 16px;
  padding: 20px;
  min-height: 360px;
`

export const PreviewLabel = styled.div`
  font-size: 11px;
  font-weight: 500;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 12px;
`

export const PreviewTag = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 6px;
  font-size: 10px;
  font-weight: 500;
  color: #93c5fd;
  letter-spacing: 0.03em;
`

// ─── Buttons ──────────────────────────────────────────────────────────────────

export const BtnRow = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`

export const Btn = styled.button`
  border: none;
  border-radius: 10px;
  padding: ${({ $small }) => ($small ? '6px 12px' : '10px 18px')};
  cursor: ${({ $loading }) => ($loading ? 'wait' : 'pointer')};
  font-size: ${({ $small }) => ($small ? '12px' : '13px')};
  font-weight: 600;
  transition: background 0.15s, box-shadow 0.15s, opacity 0.15s;
  display: flex;
  align-items: center;
  gap: 6px;
  opacity: ${({ $loading }) => ($loading ? 0.6 : 1)};
  pointer-events: ${({ $loading }) => ($loading ? 'none' : 'auto')};

  ${({ $v }) => {
    switch ($v) {
      case 'primary':
        return css`
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: #fff;
          border: 1px solid transparent;
          box-shadow: 0 4px 14px rgba(59, 130, 246, 0.3);

          &:hover {
            background: linear-gradient(135deg, #2563eb, #1e40af);
            box-shadow: 0 6px 18px rgba(59, 130, 246, 0.4);
          }
        `
      case 'success':
        return css`
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.25);

          &:hover {
            background: rgba(16, 185, 129, 0.22);
            border-color: rgba(16, 185, 129, 0.4);
          }
        `
      case 'danger':
        return css`
          background: rgba(239, 68, 68, 0.12);
          color: #fca5a5;
          border: 1px solid rgba(239, 68, 68, 0.2);

          &:hover {
            background: rgba(239, 68, 68, 0.2);
            border-color: rgba(239, 68, 68, 0.35);
          }
        `
      case 'warning':
        return css`
          background: rgba(245, 158, 11, 0.12);
          color: #fcd34d;
          border: 1px solid rgba(245, 158, 11, 0.2);

          &:hover {
            background: rgba(245, 158, 11, 0.2);
            border-color: rgba(245, 158, 11, 0.35);
          }
        `
      default:
        return css`
          background: rgba(255, 255, 255, 0.08);
          color: #f1f5f9;
          border: 1px solid rgba(255, 255, 255, 0.1);

          &:hover {
            background: rgba(255, 255, 255, 0.12);
            border-color: rgba(255, 255, 255, 0.16);
          }
        `
    }
  }}
`

// ─── Tables ───────────────────────────────────────────────────────────────────

export const TableWrap = styled.div`
  overflow-x: auto;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.07);
`

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
`

export const Th = styled.th`
  padding: 10px 14px;
  text-align: left;
  font-size: 11px;
  font-weight: 500;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  white-space: nowrap;
`

export const Td = styled.td`
  padding: 12px 14px;
  color: #f1f5f9;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  vertical-align: middle;
`

export const TrHover = styled.tr`
  &:hover {
    background: rgba(255, 255, 255, 0.02);
  }
`

// ─── Badges / Status ──────────────────────────────────────────────────────────

export const StatusDot = styled.span`
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
  animation: ${GlobalPulse} 1.8s infinite;
`

const badgeVariants = {
  draft: css`
    background: rgba(148, 163, 184, 0.1);
    color: #94a3b8;
    border: 1px solid rgba(148, 163, 184, 0.15);
  `,
  scheduled: css`
    background: rgba(59, 130, 246, 0.12);
    color: #93c5fd;
    border: 1px solid rgba(59, 130, 246, 0.2);
  `,
  active: css`
    background: rgba(16, 185, 129, 0.12);
    color: #34d399;
    border: 1px solid rgba(16, 185, 129, 0.2);
  `,
  finished: css`
    background: rgba(100, 116, 139, 0.1);
    color: #64748b;
    border: 1px solid rgba(100, 116, 139, 0.15);
  `,
  cancelled: css`
    background: rgba(239, 68, 68, 0.1);
    color: #fca5a5;
    border: 1px solid rgba(239, 68, 68, 0.15);
  `,
  pending: css`
    background: rgba(245, 158, 11, 0.1);
    color: #fcd34d;
    border: 1px solid rgba(245, 158, 11, 0.15);
  `,
  paid: css`
    background: rgba(16, 185, 129, 0.12);
    color: #34d399;
    border: 1px solid rgba(16, 185, 129, 0.2);
  `,
  failed: css`
    background: rgba(239, 68, 68, 0.1);
    color: #fca5a5;
    border: 1px solid rgba(239, 68, 68, 0.15);
  `,
  discarded: css`
    background: rgba(100, 116, 139, 0.1);
    color: #64748b;
    border: 1px solid rgba(100, 116, 139, 0.15);
  `,
}

export const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;

  ${({ $v }) => badgeVariants[$v] || badgeVariants.draft}
`

// ─── Stats ────────────────────────────────────────────────────────────────────

export const StatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 540px) {
    grid-template-columns: 1fr;
  }
`

export const StatCard = styled.div`
  background: #0c1424;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 14px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const StatValue = styled.div`
  font-size: 28px;
  font-weight: 700;
  color: #f1f5f9;
`

export const StatLabel = styled.div`
  font-size: 12px;
  color: #94a3b8;
`

// ─── Misc ─────────────────────────────────────────────────────────────────────

export const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 40px 20px;
  color: #94a3b8;
  font-size: 13px;
  text-align: center;
`

export const Divider = styled.hr`
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  margin: 16px 0;
`

export const CorrectBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 700;
  font-size: 14px;
  flex-shrink: 0;
  transition: background 0.15s, border-color 0.15s, color 0.15s;

  ${({ $selected }) =>
    $selected
      ? css`
          background: rgba(16, 185, 129, 0.2);
          border: 1px solid #10b981;
          color: #34d399;
        `
      : css`
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #94a3b8;

          &:hover {
            background: rgba(255, 255, 255, 0.09);
            color: #f1f5f9;
          }
        `}
`

// ─── Slot / Symbol ────────────────────────────────────────────────────────────

export const SymbolGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 8px;
`

export const SymbolChip = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 6px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 10px;
  font-size: 11px;
  color: #94a3b8;
  position: relative;
`

export const SymbolEmoji = styled.span`
  font-size: 24px;
  line-height: 1;
`

export const WinRateRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
`

export const WinRateVal = styled.span`
  font-size: 20px;
  font-weight: 700;
  color: #3b82f6;
  min-width: 48px;
`

// ─── Briefcase / Number Grid ──────────────────────────────────────────────────

export const NumberGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
`

export const NumberChip = styled.div`
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
  font-size: 18px;
  font-weight: 700;
  color: #60a5fa;
`

// ─── Treasure Chest / Options ─────────────────────────────────────────────────

export const OptionChip = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 20px 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 14px;
  cursor: pointer;
  font-size: 12px;
  color: #94a3b8;
  transition: background 0.15s, border-color 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.07);
    border-color: rgba(255, 255, 255, 0.12);
  }
`

export const OptionEmoji = styled.span`
  font-size: 36px;
`
