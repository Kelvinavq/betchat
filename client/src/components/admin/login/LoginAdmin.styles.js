import styled, { css } from "styled-components";

export const inputButtonBase = css`
  height: 50px;
  font-family: inherit;
  font-size: 14.5px;
  padding: 0 16px;
  border-radius: 10px;
  transition:
    background 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    filter 0.18s ease,
    transform 0.12s ease,
    opacity 0.18s ease;
`;

/* ── Page shell ─────────────────────────────────────────── */
export const Section = styled.section`
  display: flex;
  min-height: 100dvh;
  margin: 0;
  background: var(--bc-admin-content-bg, #08080f);
  color: #ffffff;
  font-family: "Inter", "Euclid Circular B", "Poppins", sans-serif;
`;

/* ── Split-screen wrapper ────────────────────────────────── */
export const LoginLayout = styled.div`
  display: flex;
  width: 100%;
  min-height: 100dvh;
`;

/* ── Brand panel (left, desktop only) ───────────────────── */
export const BrandPanel = styled.aside`
  width: 42%;
  flex-shrink: 0;
  min-height: 100dvh;
  background: var(--bc-admin-sidebar-bg, #0b0b18);
  border-right: 1px solid rgba(var(--bc-admin-accent-rgb, 30, 133, 255), 0.10);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding: 60px 52px;
  position: relative;
  overflow: hidden;

  /* Large accent glow bottom-right */
  &::before {
    content: "";
    position: absolute;
    inset: auto -120px -140px auto;
    width: 500px;
    height: 500px;
    border-radius: 50%;
    background: radial-gradient(
      circle,
      rgba(var(--bc-admin-accent-rgb, 30, 133, 255), 0.14) 0%,
      transparent 62%
    );
    pointer-events: none;
  }

  /* Faint glow top-left */
  &::after {
    content: "";
    position: absolute;
    inset: -80px auto auto -60px;
    width: 320px;
    height: 320px;
    border-radius: 50%;
    background: radial-gradient(
      circle,
      rgba(var(--bc-admin-accent-rgb, 30, 133, 255), 0.05) 0%,
      transparent 65%
    );
    pointer-events: none;
  }

  @media (max-width: 860px) {
    display: none;
  }
`;

export const BrandLogo = styled.img`
  width: 60px;
  height: 60px;
  object-fit: contain;
  margin-bottom: 28px;
  position: relative;
  z-index: 1;
`;

export const BrandTitle = styled.h2`
  font-size: 23px;
  font-weight: 600;
  letter-spacing: -0.025em;
  color: #ffffff;
  margin: 0 0 8px;
  line-height: 1.2;
  position: relative;
  z-index: 1;
`;

export const BrandSub = styled.p`
  font-size: 13px;
  color: rgba(255, 255, 255, 0.36);
  margin: 0 0 36px;
  line-height: 1.5;
  position: relative;
  z-index: 1;
`;

export const BrandDivider = styled.div`
  width: 24px;
  height: 2px;
  border-radius: 1px;
  background: var(--bc-admin-accent, #1e85ff);
  opacity: 0.60;
  margin-bottom: 36px;
  position: relative;
  z-index: 1;
`;

export const BrandTagline = styled.p`
  font-size: 17px;
  font-weight: 400;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.36);
  margin: 0;
  position: relative;
  z-index: 1;
`;

/* ── Form panel (right) ─────────────────────────────────── */
export const FormPanel = styled.main`
  flex: 1;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 40px;

  @media (max-width: 520px) {
    padding: 32px 20px;
  }
`;

export const FormInner = styled.div`
  width: 100%;
  max-width: 390px;
`;

/* Logo visible only on mobile (BrandPanel hidden) */
export const MobileLogo = styled.img`
  width: 50px;
  height: 50px;
  object-fit: contain;
  margin: 0 0 20px;

  @media (min-width: 861px) {
    display: none;
  }
`;

/* ── Form headings ──────────────────────────────────────── */
export const Heading = styled.h1`
  font-size: 26px;
  font-weight: 600;
  letter-spacing: -0.025em;
  color: #ffffff;
  margin: 0 0 8px;
  line-height: 1.2;
`;

export const Subtitle = styled.p`
  font-size: 13.5px;
  color: rgba(255, 255, 255, 0.34);
  margin: 0 0 32px;
  line-height: 1.5;
`;

/* ── Form elements ──────────────────────────────────────── */
export const Form = styled.form`
  display: grid;
  gap: 11px;
  width: 100%;
  margin: 0 0 16px;
`;

export const Socials = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
`;

export const SsoBtn = styled.button`
  ${inputButtonBase}
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.09);
  color: rgba(255, 255, 255, 0.60);
  font-size: 13px;
  cursor: pointer;

  img {
    display: block;
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    ${({ invertIcon }) => invertIcon && "filter: invert(1) opacity(0.70);"}
  }

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.15);
    color: rgba(255, 255, 255, 0.85);
  }

  &:active:not(:disabled) {
    transform: scale(0.98);
  }

  &:disabled {
    opacity: 0.32;
    cursor: not-allowed;
  }
`;

export const Or = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.20);

  &::before,
  &::after {
    content: "";
    flex: 1;
    height: 1px;
    background: rgba(255, 255, 255, 0.07);
  }
`;

export const TextboxLabel = styled.label`
  transition: scale 0.18s ease, translate 0.18s ease, color 0.18s ease;
  position: absolute;
  top: 50%;
  left: 14px;
  translate: 0 -50%;
  transform-origin: 0 50%;
  pointer-events: none;
  color: rgba(255, 255, 255, 0.32);
  font-size: 14px;
`;

export const TextboxInput = styled.input`
  ${inputButtonBase}
  width: 100%;
  padding-top: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid ${({ $hasError }) =>
    $hasError ? "rgba(248,113,113,0.55)" : "rgba(255,255,255,0.09)"};
  outline: none;
  color: #ffffff;
  box-shadow: 0 0 0 3px transparent;

  &:hover:not(:focus) {
    background: rgba(255, 255, 255, 0.06);
    border-color: ${({ $hasError }) =>
      $hasError ? "rgba(248,113,113,0.70)" : "rgba(255,255,255,0.15)"};
  }

  &:focus {
    background: rgba(255, 255, 255, 0.06);
    border-color: ${({ $hasError }) =>
      $hasError
        ? "rgba(248,113,113,0.70)"
        : "rgba(var(--bc-admin-accent-rgb, 30, 133, 255), 0.65)"};
    box-shadow: 0 0 0 3px
      ${({ $hasError }) =>
        $hasError
          ? "rgba(248,113,113,0.10)"
          : "rgba(var(--bc-admin-accent-rgb, 30, 133, 255), 0.12)"};
  }

  &:is(:focus, :not(:invalid)) ~ ${TextboxLabel} {
    scale: 0.74;
    translate: 0 -116%;
    color: rgba(255, 255, 255, 0.48);
  }
`;

export const TextboxWrapper = styled.div`
  position: relative;
`;

export const SubmitBtn = styled.button`
  ${inputButtonBase}
  background: var(
    --bc-admin-button-gradient,
    linear-gradient(135deg, #0a2e50 0%, #1e85ff 100%)
  );
  color: #ffffff;
  border: none;
  font-weight: 500;
  font-size: 14.5px;
  cursor: pointer;
  margin-top: 6px;
  box-shadow: 0 4px 20px rgba(var(--bc-admin-accent-rgb, 30, 133, 255), 0.22);

  &:disabled {
    cursor: not-allowed;
    opacity: 0.42;
    box-shadow: none;
    transform: none;
    filter: none;
  }

  &:hover:not(:disabled) {
    filter: brightness(1.13);
    box-shadow: 0 6px 28px rgba(var(--bc-admin-accent-rgb, 30, 133, 255), 0.36);
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: translateY(0) scale(0.99);
    filter: brightness(0.95);
    box-shadow: 0 2px 10px rgba(var(--bc-admin-accent-rgb, 30, 133, 255), 0.20);
  }
`;

export const ForgotLink = styled.a`
  font-size: 13px;
  color: rgba(255, 255, 255, 0.28);
  text-decoration: none;
  transition: color 0.18s;
  cursor: pointer;

  &:hover {
    color: rgba(255, 255, 255, 0.58);
  }
`;

export const AlertBox = styled.div`
  width: 100%;
  padding: 12px 14px;
  border-radius: 9px;
  border: 1px solid
    ${({ $type }) =>
      $type === "success"
        ? "rgba(34,197,94,0.28)"
        : $type === "schedule" || $type === "warning"
        ? "rgba(245,158,11,0.28)"
        : "rgba(248,113,113,0.28)"};
  background: ${({ $type }) =>
    $type === "success"
      ? "rgba(34,197,94,0.06)"
      : $type === "schedule" || $type === "warning"
      ? "rgba(245,158,11,0.06)"
      : "rgba(248,113,113,0.06)"};
  color: ${({ $type }) =>
    $type === "success"
      ? "#4ade80"
      : $type === "schedule" || $type === "warning"
      ? "#fbbf24"
      : "#f87171"};
  font-size: 13px;
  line-height: 1.5;
  text-align: left;
  margin-bottom: 12px;
`;

export const FieldError = styled.span`
  display: block;
  margin-top: 5px;
  color: #f87171;
  font-size: 12px;
  text-align: left;
`;

export const Footer = styled.p`
  margin: 28px 0 0;
  font-size: 11.5px;
  color: rgba(255, 255, 255, 0.17);
  text-align: center;
`;

/* ── Biometric enroll modal ─────────────────────────────── */
export const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  background: rgba(2, 5, 14, 0.82);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
`;

export const ModalCard = styled.div`
  width: 100%;
  max-width: 420px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: var(--bc-admin-sidebar-bg, #0b0b18);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  padding: 28px;
  text-align: left;
`;

export const ModalTitle = styled.h3`
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  line-height: 1.3;
  color: #ffffff;
`;

export const ModalSub = styled.p`
  margin: 8px 0 0;
  font-size: 13.5px;
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.40);
`;

export const ModalFoot = styled.div`
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 24px;

  @media (max-width: 480px) {
    flex-direction: column-reverse;
  }
`;

export const ModalBtn = styled.button`
  ${inputButtonBase}
  min-width: 112px;
  border: 1px solid
    ${({ $v }) => ($v === "primary" ? "transparent" : "rgba(255,255,255,0.09)")};
  background: ${({ $v }) =>
    $v === "primary"
      ? "var(--bc-admin-button-gradient, linear-gradient(135deg, #0a2e50 0%, #1e85ff 100%))"
      : "rgba(255,255,255,0.04)"};
  color: ${({ $v }) =>
    $v === "primary" ? "#ffffff" : "rgba(255,255,255,0.62)"};
  cursor: pointer;
  font-weight: 500;

  &:hover:not(:disabled) {
    filter: brightness(1.1);
    ${({ $v }) =>
      $v !== "primary" &&
      css`
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.15);
        filter: none;
      `}
  }

  &:active {
    transform: scale(0.98);
  }
`;
