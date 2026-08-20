"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon, SendIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { WHATSAPP_PROVIDER_LABELS, type MessageSettings, type WhatsAppProviderName } from "@/lib/types";
import { messageSettingsSchema, type MessageSettingsInput } from "@/lib/validations";
import { saveMessageSettings, sendTestMessage } from "@/app/actions";

const DEFAULT_TEMPLATE =
  "Olá {nome_cliente}, identificamos que a sua parcela {numero_parcela} no valor de R$ {valor} com vencimento em {data_vencimento} consta pendente. Por favor, entre em contato para regularizar.";

const PROVIDER_FIELDS: Record<WhatsAppProviderName, { label: string; key: keyof MessageSettingsInput }[]> = {
  evolution: [
    { label: "URL base (ex: https://minha-evolution.com)", key: "baseUrl" },
    { label: "API Key", key: "apiKey" },
    { label: "Instance ID", key: "instanceId" },
  ],
  zapi: [
    { label: "URL base (ex: https://api.z-api.io)", key: "baseUrl" },
    { label: "Instance ID", key: "instanceId" },
    { label: "Token (API Key)", key: "apiKey" },
  ],
  twilio: [
    { label: "Account SID", key: "instanceId" },
    { label: "Auth Token", key: "authToken" },
    { label: "Número remetente (ex: +14155238886)", key: "senderNumber" },
  ],
  wppconnect: [
    { label: "URL base (ex: https://minha-wppconnect.com)", key: "baseUrl" },
    { label: "Sessão (Instance ID)", key: "instanceId" },
    { label: "Token (API Key)", key: "apiKey" },
  ],
};

export function SettingsForm({ initialSettings }: { initialSettings: MessageSettings | null }) {
  const [testPhone, setTestPhone] = useState("");
  const [isTesting, setIsTesting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<MessageSettingsInput>({
    resolver: zodResolver(messageSettingsSchema),
    defaultValues: {
      provider: initialSettings?.provider ?? "evolution",
      baseUrl: initialSettings?.base_url ?? "",
      apiKey: initialSettings?.api_key ?? "",
      instanceId: initialSettings?.instance_id ?? "",
      senderNumber: initialSettings?.sender_number ?? "",
      authToken: initialSettings?.auth_token ?? "",
      messageTemplate: initialSettings?.message_template ?? DEFAULT_TEMPLATE,
    },
  });

  const provider = watch("provider");
  const fields = PROVIDER_FIELDS[provider];

  const onSubmit = handleSubmit(async (data) => {
    const result = await saveMessageSettings(data);
    if (result.ok) {
      toast.success("Configuração salva com sucesso.");
    } else {
      toast.error(result.error ?? "Erro ao salvar configuração.");
    }
  });

  async function handleTestSend() {
    if (!testPhone) {
      toast.error("Informe um telefone para o teste.");
      return;
    }
    setIsTesting(true);
    const result = await sendTestMessage(testPhone);
    setIsTesting(false);
    if (result.ok) {
      toast.success("Mensagem de teste enviada.");
    } else {
      toast.error(result.error ?? "Erro ao enviar mensagem de teste.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <SpotlightCard>
        <CardHeader>
          <CardTitle>Provedor de WhatsApp</CardTitle>
          <CardDescription>
            Escolha e configure a API responsável pelo envio das cobranças (Evolution API, Z-API, Twilio ou
            WPPConnect).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-1.5 sm:max-w-xs">
            <Label htmlFor="provider">Provedor</Label>
            <Controller
              control={control}
              name="provider"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="provider">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(WHATSAPP_PROVIDER_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((field) => (
              <div key={field.key} className="grid gap-1.5">
                <Label htmlFor={field.key}>{field.label}</Label>
                <Input id={field.key} {...register(field.key)} />
              </div>
            ))}
          </div>
        </CardContent>
      </SpotlightCard>

      <SpotlightCard>
        <CardHeader>
          <CardTitle>Template da mensagem</CardTitle>
          <CardDescription>
            Use os placeholders <code>{"{nome_cliente}"}</code>, <code>{"{numero_parcela}"}</code>,{" "}
            <code>{"{valor}"}</code> e <code>{"{data_vencimento}"}</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea rows={4} {...register("messageTemplate")} />
          {errors.messageTemplate && (
            <p className="mt-1.5 text-xs text-destructive">{errors.messageTemplate.message}</p>
          )}
        </CardContent>
      </SpotlightCard>

      <div className="flex justify-end">
        <Button type="submit" variant="glow" disabled={isSubmitting} size="lg">
          {isSubmitting ? "Salvando..." : "Salvar configuração"}
        </Button>
      </div>

      <SpotlightCard>
        <CardHeader>
          <CardTitle>Testar envio</CardTitle>
          <CardDescription>Salve a configuração acima antes de testar.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="grid flex-1 gap-1.5">
            <Label htmlFor="testPhone">Telefone para teste</Label>
            <Input
              id="testPhone"
              placeholder="(11) 91234-5678"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
            />
          </div>
          <Button type="button" variant="outline" onClick={handleTestSend} disabled={isTesting}>
            {isTesting ? <Loader2Icon className="animate-spin" /> : <SendIcon />}
            Enviar teste
          </Button>
        </CardContent>
      </SpotlightCard>
    </form>
  );
}
