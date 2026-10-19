import type { Cliente } from "@prisma/client";

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
      {campo("documento", "CPF / CNPJ")}
      {campo("contato", "Pessoa de contato")}
      {campo("telefone", "Telefone / WhatsApp", { type: "tel" })}
      {campo("email", "E-mail", { type: "email" })}
      <div className="sm:col-span-2">
        <label className="label" htmlFor="observacoes">Observações</label>
        <textarea className="input" id="observacoes" name="observacoes" rows={3} defaultValue={cliente?.observacoes ?? ""} />
      </div>
      <div className="sm:col-span-2">
        <button className="btn btn-gold w-full sm:w-auto" type="submit">{label}</button>
      </div>
    </form>
  );
}
