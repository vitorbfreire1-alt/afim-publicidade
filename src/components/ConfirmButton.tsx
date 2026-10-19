"use client";

/** Botão de envio que pede confirmação antes de executar a ação do formulário. */
export default function ConfirmButton({ mensagem, className, children }: {
  mensagem: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(mensagem)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
