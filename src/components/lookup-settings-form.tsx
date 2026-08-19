"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon, SearchIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { LookupSettings } from "@/lib/types";
import { lookupSettingsSchema, type LookupSettingsInput } from "@/lib/validations";
import { lookupPhoneAction, saveLookupSettings } from "@/app/actions";

export function LookupSettingsForm({ initialSettings }: { initialSettings: LookupSettings | null }) {
  const [testPhone, setTestPhone] = useState("");
  const [isTesting, setIsTesting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LookupSettingsInput>({
    resolver: zodResolver(lookupSettingsSchema),
    defaultValues: {
      provider: initialSettings?.provider ?? "generic_rest",
      baseUrl: initialSettings?.base_url ?? "",
      method: initialSettings?.method ?? "GET",
      apiKey: initialSettings?.api_key ?? "",
      authHeader: initialSettings?.auth_header ?? "",
      authScheme: initialSettings?.auth_scheme ?? "",
      bodyTemplate: initialSettings?.body_template ?? "",
      documentField: initialSettings?.document_field ?? "",
      documentTypeField: initialSettings?.document_type_field ?? "",
      nameField: initialSettings?.name_field ?? "",
      cepField: initialSettings?.cep_field ?? "",
      addressField: initialSettings?.address_field ?? "",
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    const result = await saveLookupSettings(data);
    if (result.ok) {
      toast.success("Configuração de consulta salva com sucesso.");
    } else {
      toast.error(result.error ?? "Erro ao salvar configuração.");
    }
  });

  async function handleTestLookup() {
    if (!testPhone) {
      toast.error("Informe um telefone para o teste.");
      return;
    }
    setIsTesting(true);
    const result = await lookupPhoneAction(testPhone);
    setIsTesting(false);
    if (result.ok && result.data) {
      toast.success(
        `CPF/CNPJ: ${result.data.document ?? "—"} · CEP: ${result.data.cep ?? "—"} · Endereço: ${result.data.address ?? "—"}`,
      );
    } else {
      toast.error(result.error ?? "Erro ao consultar telefone.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Consulta de dados cadastrais</CardTitle>
          <CardDescription>
            Conector genérico para a API do provedor de consulta cadastral (CPF/CNPJ, CEP, endereço a partir de
            telefone) que sua empresa contratar — ex: Big Data Corp, Assertiva, Direct Data, SintegraWS. Não há
            base pública gratuita para esse tipo de consulta no Brasil; é necessário um provedor pago e um uso
            compatível com a LGPD (ex: proteção ao crédito, art. 7º, X). Use <code>{"{phone}"}</code> na URL/corpo
            para indicar onde o telefone (apenas dígitos) deve ser inserido.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="lookupMethod">Método</Label>
              <Controller
                control={control}
                name="method"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="lookupMethod">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="baseUrl">URL da API (ex: https://api.provedor.com/v1/consulta?telefone={"{phone}"})</Label>
              <Input id="baseUrl" {...register("baseUrl")} />
              {errors.baseUrl && <p className="text-xs text-destructive">{errors.baseUrl.message}</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label htmlFor="apiKey">Chave de API</Label>
              <Input id="apiKey" {...register("apiKey")} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="authHeader">Header de autenticação (ex: Authorization, apikey)</Label>
              <Input id="authHeader" {...register("authHeader")} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="authScheme">Prefixo do header (ex: Bearer)</Label>
              <Input id="authScheme" {...register("authScheme")} />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="bodyTemplate">Corpo da requisição (POST, JSON — opcional)</Label>
            <Input id="bodyTemplate" placeholder={'{"telefone":"{phone}"}'} {...register("bodyTemplate")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mapeamento da resposta</CardTitle>
          <CardDescription>
            Caminho (dot-path) de cada campo dentro do JSON retornado pela API. Ex: <code>data.cpf</code> ou{" "}
            <code>resultado.0.documento</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="documentField">CPF/CNPJ</Label>
            <Input id="documentField" {...register("documentField")} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="documentTypeField">Tipo de documento (opcional, senão inferido pelo tamanho)</Label>
            <Input id="documentTypeField" {...register("documentTypeField")} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="nameField">Nome</Label>
            <Input id="nameField" {...register("nameField")} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cepField">CEP</Label>
            <Input id="cepField" {...register("cepField")} />
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="addressField">Endereço</Label>
            <Input id="addressField" {...register("addressField")} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" variant="glow" disabled={isSubmitting} size="lg">
          {isSubmitting ? "Salvando..." : "Salvar configuração"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Testar consulta</CardTitle>
          <CardDescription>Salve a configuração acima antes de testar.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="grid flex-1 gap-1.5">
            <Label htmlFor="testLookupPhone">Telefone para teste</Label>
            <Input
              id="testLookupPhone"
              placeholder="(11) 91234-5678"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
            />
          </div>
          <Button type="button" variant="outline" onClick={handleTestLookup} disabled={isTesting}>
            {isTesting ? <Loader2Icon className="animate-spin" /> : <SearchIcon />}
            Consultar
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
