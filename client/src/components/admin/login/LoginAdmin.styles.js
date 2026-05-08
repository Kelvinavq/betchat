import styled, { css } from "styled-components";
import { colors, gradients, shadows } from "../../../styles/theme";

export const inputButtonBase = css`
  height: 56px;
  font-family: inherit;
  font-size: 15px;
  padding: 0 16px;
  border-radius: 12px;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
`;

export const Section = styled.section`
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  min-height: 100dvh;
  background: ${gradients.loginBg};
  color: ${colors.white};
  font-family: "Euclid Circular B", "Poppins", sans-serif;
  padding: 24px 16px;
`;

export const Canvas = styled.canvas`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
`;

export const Card = styled.div`
  position: relative;
  z-index: 2;
  background: ${gradients.card};
  border: 1px solid ${colors.glass.border};
  box-shadow: ${shadows.glassCard};
  backdrop-filter: blur(28px) saturate(160%);
  -webkit-backdrop-filter: blur(28px) saturate(160%);
  border-radius: 48px;
  padding: 64px 40px 52px;
  width: 100%;
  max-width: 520px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
`;

export const Logo = styled.img`
  width: 120px;
  height: 120px;
  object-fit: contain;
  margin: 0 0 40px;
`;

export const Subtitle = styled.h3`
  font-size: 11px;
  font-weight: 400;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: ${colors.glass.textTitle};
  margin: 0 0 40px;
`;

export const Form = styled.form`
  display: grid;
  gap: 14px;
  width: 100%;
  margin: 0 0 18px;
`;

export const Socials = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
`;

export const SsoBtn = styled.button`
  ${inputButtonBase}
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  background: ${colors.glass.bg};
  border: 1px solid ${colors.glass.border};
  color: ${colors.glass.textWhite60};
  font-size: 14px;
  cursor: pointer;

  img {
    display: block;
    width: 18px;
    height: 18px;
    flex-shrink: 0;

    ${({ invertIcon }) => invertIcon && `filter: invert(1);`}
  }

  &:hover {
    background: ${colors.glass.bgHover};
    border-color: ${colors.glass.borderHover};
    color: ${colors.glass.textWhite85};
  }

  &:active {
    transform: scale(0.98);
  }
`;

export const Or = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: ${colors.glass.text};

  &::before,
  &::after {
    content: "";
    flex: 1;
    height: 1px;
    background: ${colors.glass.divider};
  }
`;

export const TextboxLabel = styled.label`
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  position: absolute;
  top: 50%;
  left: 16px;
  translate: 0 -50%;
  transform-origin: 0 50%;
  pointer-events: none;
  color: ${colors.glass.textInput};
  font-size: 15px;
`;

export const TextboxInput = styled.input`
  ${inputButtonBase}
  width: 100%;
  padding-top: 12px;
  background: ${colors.glass.bg};
  border: 1px solid ${({ $hasError }) => ($hasError ? '#f87171' : colors.glass.border)};
  outline: none;
  color: ${colors.white};
  box-shadow: 0 0 0 2px transparent;

  &:hover {
    background: ${colors.glass.bgHover};
    border-color: ${({ $hasError }) => ($hasError ? '#f87171' : colors.glass.borderHover)};
  }

  &:focus {
    background: ${colors.glass.bgFocus};
    border-color: transparent;
    box-shadow: ${({ $hasError }) => ($hasError ? '0 0 0 2px rgba(248, 113, 113, 0.18)' : shadows.glassFocus)};
  }

  &:is(:focus, :not(:invalid)) ~ ${TextboxLabel} {
    scale: 0.72;
    translate: 0 -118%;
  }
`;

export const TextboxWrapper = styled.div`
  position: relative;
`;

export const SubmitBtn = styled.button`
  ${inputButtonBase}
  background: ${gradients.btn};
  color: ${colors.primaryAccent};
  border: none;
  font-weight: 400;
  font-size: 14px;
  letter-spacing: 1px;
  text-transform: uppercase;
  cursor: pointer;
  margin-top: 4px;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.72;
    filter: saturate(0.9);
  }

  &:hover {
    background: ${gradients.btnHover};
  }

  &:active {
    transform: scale(0.98);
    background: ${gradients.btnActive};
  }
`;

export const ForgotLink = styled.a`
  font-size: 13px;
  color: ${colors.glass.textInput};
  text-decoration: none;
  transition: color 0.2s;
  cursor: pointer;

  &:hover {
    color: ${colors.primaryLighter};
  }
`;

export const AlertBox = styled.div`
  width: 100%;
  padding: 16px 18px;
  border-radius: 18px;
  border: 1px solid ${({ $type }) => ($type === 'success' ? '#1ec07e' : '#f87171')};
  background: ${({ $type }) => ($type === 'success' ? 'rgba(41, 194, 136, 0.12)' : 'rgba(248, 113, 113, 0.12)')};
  color: ${({ $type }) => ($type === 'success' ? '#0f766e' : '#b91c1c')};
  font-size: 13px;
  text-align: left;
  margin-bottom: 14px;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
`;

export const FieldError = styled.span`
  display: block;
  margin-top: 8px;
  color: #f87171;
  font-size: 12px;
  text-align: left;
`;

export const Footer = styled.p`
  margin: 40px 0 0;
  font-size: 13px;
  color: ${colors.glass.textSubtle};

  a {
    color: ${colors.primaryLight};
    text-decoration: none;
    transition: color 0.2s;

    &:hover {
      color: ${colors.primaryLighter};
    }
  }
`;
