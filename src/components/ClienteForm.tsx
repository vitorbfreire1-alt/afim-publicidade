import type { Cliente } from "@prisma/client";
import MaskedInput from "./MaskedInput";

export default function ClienteForm({ cliente, action, label }: {
  cliente?: Cliente;
  action: (fd: FormData) => void | Promise<void>;
  label: string;
}) {
  const campo = (name: keyof Cliente, titulo: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className="label" htmlFor={name}>{titulo}</label>
      <input className="input" id={name} name={name} defaultValue={(cliente?.[name] as string | null) ?? ""} {...props} />
    </div>
  );
  return (
    <form action={action} className="card grid gap-4 p-4 sm:grid-cols-2">
      <div className="sm:col-span-2">{campo("nome", "Cliente / Empresa", { required: true })}</div>
      <div>
        <label className="label" htmlFor="documento">CPF / CNPJ</label>
        <MaskedInput className="input" id="documento" name="documento" mask="documento" placeholder="000.000.000-00 ou 00.000.000/0000-00" defaultValue={cliente?.documento ?? ""} />
      </div>
      {campo("contato", "Pessoa de contato")}
      <div>
        <label className="label" htmlFor="telefone">Telefone / WhatsApp</label>
        <MaskedInput className="input" id="telefone" name="telefone" mask="telefone" type="tel" placeholder="(00) 00000-0000" defaultValue={cliente?.telefone ?? ""} />
      </div>
      {campo("email", "E-mail", { type: "email" })}
      <div className="sm:col-span-2">
        <label className="label" htmlFor="observacoes">Observações</label>
        <textarea className="input" id="observacoes" name="observacoes" rows={3} defaultValue={cliente?.observacoes ?? ""} />
      </div>
      <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row">
        <button className="btn btn-gold" type="submit">{label}</button>
        {!cliente && (
          <button className="btn" type="submit" name="proximo" value="contrato">
            Cadastrar e criar contrato
          </button>
        )}
      </div>
    </form>
  );
}
