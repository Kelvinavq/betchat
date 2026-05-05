import { useRef, useState, useEffect } from "react";
import logo from "../../../assets/apple.svg";
import faceid from "../../../assets/faceid.svg";
import googleIcon from "../../../assets/google.svg";
import fingerprint from "../../../assets/fingerprint.svg";
import { useWebGLBackground } from "./useWebGLBackground";
import {
  Section,
  Canvas,
  Card,
  Logo,
  Subtitle,
  Form,
  Socials,
  SsoBtn,
  Or,
  TextboxWrapper,
  TextboxInput,
  TextboxLabel,
  SubmitBtn,
  ForgotLink,
  Footer,
} from "./LoginAdmin.styles";

const Textbox = ({ id, type, label }) => (
  <TextboxWrapper>
    <TextboxInput autoComplete="off" required type={type} id={id} />
    <TextboxLabel htmlFor={id}>{label}</TextboxLabel>
  </TextboxWrapper>
);

const LoginAdmin = ({ onSubmit }) => {
  const canvasRef = useRef(null);
  const [deviceType, setDeviceType] = useState("other");
  useWebGLBackground(canvasRef);

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
      setDeviceType("ios");
    } else if (/android/i.test(userAgent)) {
      setDeviceType("android");
    } else {
      setDeviceType("pc");
    }
  }, []);

  const biometricIcon = deviceType === "ios" ? faceid : fingerprint;
  const biometricLabel = deviceType === "ios" ? "FaceID" : "Huella";

  return (
    <Section>
      <Canvas ref={canvasRef} />
      <Card>
        <Logo src={logo} alt="logo" />
        <Subtitle>Bienvenido de vuelta!</Subtitle>
        <Form onSubmit={onSubmit}>
          <Socials>
            <SsoBtn type="button">
              <img src={googleIcon} alt="Google" />
              <span>Google</span>
            </SsoBtn>
            <SsoBtn type="button" invertIcon>
              <img src={biometricIcon} alt={biometricLabel} />
              <span>{biometricLabel}</span>
            </SsoBtn>
          </Socials>
          <Or>ó</Or>
          <Textbox id="login-6-user" type="text" label="Usuario" />
          <Textbox id="login-6-password" type="password" label="Contraseña" />
          <SubmitBtn type="submit">Ingresar</SubmitBtn>
        </Form>
        <ForgotLink href="#">¿Olvidaste tu contraseña?</ForgotLink>
        <Footer>BetChat &copy; 2026. Todos los derechos reservados.</Footer>
      </Card>
    </Section>
  );
};

export default LoginAdmin;
