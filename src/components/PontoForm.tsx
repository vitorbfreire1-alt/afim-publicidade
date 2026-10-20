import type { Ponto } from "@prisma/client";
import { TIPOS, TIPO_SINGULAR } from "@/lib/labels";

export default function PontoForm({ ponto, tipoInicial, action, label }: {
  ponto?: Ponto;
  tipoInicial?: string;
  action: (fd: FormData) => void | Promise<void>;
  label: string;
}) {
  return (
    <form action={action} className="card grid gap-4 p-4 sm:grid-cols-2">
      <div>
        <label className="label" htmlFor="tipo">Tipo de mídia</label>
        <select className="input" id="tipo" name="tipo" defaultValue={ponto?.tipo ?? tipoInicial ?? "LED"}>
          {TIPOS.map((t) => (
            <option key={t} value={t}>{TIPO_SINGULAR[t]}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="nome">Ponto (nome / local)</label>
        <input className="input" id="nome" name="nome" required defaultValue={ponto?.nome ?? ""} />
      </div>
      <div>
        <label className="label" htmlFor="cotas">Cotas (anunciantes ao mesmo tempo)</label>
        <input className="input" id="cotas" name="cotas" type="number" min={1} max={1000} placeholder="Sem limite" defaultValue={ponto?.cotas ?? ""} />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="endereco">Endereço</label>
        <input className="input" id="endereco" name="endereco" defaultValue={ponto?.endereco ?? ""} />
      </div>
      <fieldset className="grid gap-4 sm:col-span-2 sm:grid-cols-4">
        <legend className="label">Ficha técnica</legend>
        <div>
          <label className="label" htmlFor="larguraM">Largura (m)</label>
          <input className="input" id="larguraM" name="larguraM" inputMode="decimal" defaultValue={ponto?.larguraM != null ? String(Number(ponto.larguraM)) : ""} />
        </div>
        <div>
          <label className="label" htmlFor="alturaM">Altura (m)</label>
          <input className="input" id="alturaM" name="alturaM" inputMode="decimal" defaultValue={ponto?.alturaM != null ? String(Number(ponto.alturaM)) : ""} />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="resolucao">Resolução / pitch</label>
          <input className="input" id="resolucao" name="resolucao" placeholder="Ex.: P4 · 960x576 px" defaultValue={ponto?.resolucao ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="formato">Formato do outdoor</label>
          <input className="input" id="formato" name="formato" placeholder="Ex.: 9x3" defaultValue={ponto?.formato ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="latitude">Latitude</label>
          <input className="input" id="latitude" name="latitude" inputMode="decimal" placeholder="-16.7282" defaultValue={ponto?.latitude ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="longitude">Longitude</label>
          <input className="input" id="longitude" name="longitude" inputMode="decimal" placeholder="-43.8578" defaultValue={ponto?.longitude ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="proprietario">Proprietário do imóvel</label>
          <input className="input" id="proprietario" name="proprietario" defaultValue={ponto?.proprietario ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="proprietarioContato">Contato do proprietário</label>
          <input className="input" id="proprietarioContato" name="proprietarioContato" defaultValue={ponto?.proprietarioContato ?? ""} />
        </div>
      </fieldset>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="observacoes">Observações (tamanho, faces, etc.)</label>
        <textarea className="input" id="observacoes" name="observacoes" rows={3} defaultValue={ponto?.observacoes ?? ""} />
      </div>
      <div className="sm:col-span-2">
        <button className="btn btn-gold w-full sm:w-auto" type="submit">{label}</button>
      </div>
    </form>
  );
}
