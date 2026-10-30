"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, LogOutIcon, QrCodeIcon, RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { WHATSAPP_PROVIDER_LABELS, type MessageSettings } from "@/lib/types";
import { connectWhatsAppEvolution, disconnectWhatsAppEvolution, getWhatsAppConnectionStatus } from "@/app/actions";

export function ConnectionPanel({ settings }: { settings: MessageSettings | null }) {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);

  if (!settings) {
    return (
      <SpotlightCard>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Nenhuma configuração de WhatsApp ativa. Configure o provedor em{" "}
          <a href="/settings" className="text-primary underline">
            Ajustes
          </a>{" "}
          antes de conectar.
        </CardContent>
      </SpotlightCard>
    );
  }

  const isEvolution = settings.provider === "evolution";

  async function handleCheckStatus() {
    setChecking(true);
    setStatusText(null);
    const result = await getWhatsAppConnectionStatus();
    setChecking(false);
    if (!result.checked) {
      setStatusText(`Healthcheck não disponível para ${WHATSAPP_PROVIDER_LABELS[settings!.provider]} — confira enviando um teste em Ajustes.`);
      return;
    }
    if (result.ok) {
      setStatusText(`Conectado${result.state ? ` (estado: ${result.state})` : ""}.`);
      toast.success("Conexão ativa.");
    } else {
      setStatusText(result.error);
      toast.error(result.error);
    }
  }

  async function handleConnect() {
    setConnecting(true);
    setQrCode(null);
    setPairingCode(null);
    const result = await connectWhatsAppEvolution();
    setConnecting(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    if (result.alreadyConnected) {
      toast.success("Instância já está conectada.");
      router.refresh();
      return;
    }
    if (result.qrCodeBase64) {
      setQrCode(result.qrCodeBase64);
      setPairingCode(result.pairingCode ?? null);
      toast.success("QR Code gerado — escaneie no WhatsApp do número que vai cobrar.");
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    const result = await disconnectWhatsAppEvolution();
    setDisconnecting(false);
    if (result.ok) {
      toast.success("Desconectado.");
      setQrCode(null);
      router.refresh();
    } else {
      toast.error(result.error ?? "Erro ao desconectar.");
    }
  }

  return (
    <SpotlightCard>
      <CardHeader>
        <CardTitle>Conexão com o WhatsApp</CardTitle>
        <CardDescription>
          Provedor ativo: {WHATSAPP_PROVIDER_LABELS[settings.provider]}
          {isEvolution && settings.instance_id ? ` · instância ${settings.instance_id}` : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleCheckStatus} disabled={checking}>
            {checking ? <Loader2Icon className="animate-spin" /> : <RefreshCwIcon />}
            Atualizar estado
          </Button>

          {isEvolution && (
            <>
              <Button type="button" size="sm" onClick={handleConnect} disabled={connecting}>
                {connecting ? <Loader2Icon className="animate-spin" /> : <QrCodeIcon />}
                {settings.instance_id ? "Reconectar / novo QR Code" : "Conectar WhatsApp"}
              </Button>
              {settings.instance_id && (
                <Button type="button" variant="outline" size="sm" onClick={handleDisconnect} disabled={disconnecting}>
                  {disconnecting ? <Loader2Icon className="animate-spin" /> : <LogOutIcon />}
                  Desconectar
                </Button>
              )}
            </>
          )}
        </div>

        {statusText && <p className="text-sm text-muted-foreground">{statusText}</p>}

        {!isEvolution && (
          <p className="text-sm text-muted-foreground">
            {WHATSAPP_PROVIDER_LABELS[settings.provider]} não usa pareamento por QR Code — a conexão é só pelas
            credenciais já configuradas em Ajustes.
          </p>
        )}

        {qrCode && (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element -- imagem base64 dinâmica, sem otimização de imagem fixa. */}
            <img src={qrCode} alt="QR Code do WhatsApp" className="size-56 rounded-md bg-white p-2" />
            {pairingCode && <p className="text-sm text-muted-foreground">Código de pareamento: {pairingCode}</p>}
            <p className="text-center text-xs text-muted-foreground">
              Abra o WhatsApp no celular que vai enviar as cobranças → Aparelhos conectados → Conectar um aparelho.
            </p>
          </div>
        )}
      </CardContent>
    </SpotlightCard>
  );
}
