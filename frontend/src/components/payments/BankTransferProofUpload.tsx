'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import { CheckCircle2, FileUp, Paperclip } from 'lucide-react';
import {
  uploadPaymentProof,
  type PaymentRecord,
} from '@/lib/api';
import { useToast } from '@/components/shop/ToastProvider';
import './payment-proof.css';

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];

type Props = {
  payment: PaymentRecord;
  onSubmitted?: (payment: PaymentRecord) => void;
};

export function BankTransferProofUpload({ payment, onSubmitted }: Props) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    payment.status === 'AWAITING_PROOF' || payment.status === 'FAILED';

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] ?? null;
    setError(null);
    if (!next) {
      setFile(null);
      return;
    }
    if (!ALLOWED.includes(next.type)) {
      setError('Utilisez un fichier PDF, JPG, PNG ou WEBP.');
      event.target.value = '';
      return;
    }
    if (next.size > MAX_BYTES) {
      setError('Le fichier ne doit pas dépasser 8 Mo.');
      event.target.value = '';
      return;
    }
    setFile(next);
  }

  async function submit() {
    if (!file || busy || !canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await uploadPaymentProof(payment.id, file, note);
      toast.push('Justificatif envoyé pour vérification');
      onSubmitted?.(updated);
      setFile(null);
      setNote('');
      if (inputRef.current) inputRef.current.value = '';
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : 'Envoi du justificatif impossible';
      setError(message);
      toast.push(message, 'error');
    } finally {
      setBusy(false);
    }
  }

  if (payment.status === 'PROOF_SUBMITTED') {
    return (
      <div className="proof-status proof-status--pending" role="status">
        <CheckCircle2 size={20} aria-hidden />
        <div>
          <strong>Justificatif reçu</strong>
          <p>Notre équipe vérifie actuellement votre virement.</p>
        </div>
      </div>
    );
  }

  if (payment.status === 'SUCCEEDED') {
    return (
      <div className="proof-status proof-status--success" role="status">
        <CheckCircle2 size={20} aria-hidden />
        <div>
          <strong>Virement confirmé</strong>
          <p>Le paiement de cette commande a été validé.</p>
        </div>
      </div>
    );
  }

  if (!canSubmit) return null;

  return (
    <div className="proof-upload">
      {payment.status === 'FAILED' ? (
        <div className="proof-upload__rejected" role="alert">
          <strong>Justificatif refusé</strong>
          <p>
            {payment.failureReason ||
              'Le document envoyé n’a pas pu être validé. Envoyez-en un nouveau.'}
          </p>
        </div>
      ) : null}

      <div className="proof-upload__head">
        <FileUp size={21} aria-hidden />
        <div>
          <h3>Envoyer mon justificatif</h3>
          <p>Reçu ou capture du virement — PDF ou image, 8 Mo maximum.</p>
        </div>
      </div>

      <label className="proof-upload__file">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
          onChange={selectFile}
        />
        <Paperclip size={17} aria-hidden />
        <span>{file ? file.name : 'Choisir un fichier'}</span>
      </label>

      <label className="proof-upload__note">
        <span>Note (optionnel)</span>
        <textarea
          maxLength={300}
          rows={2}
          value={note}
          placeholder="Ex. virement effectué depuis le compte de…"
          onChange={(event) => setNote(event.target.value)}
        />
      </label>

      {error ? (
        <p className="proof-upload__error" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        className="proof-upload__submit"
        disabled={!file || busy}
        onClick={() => void submit()}
      >
        {busy ? 'Envoi…' : 'Envoyer le justificatif'}
      </button>
      <p className="proof-upload__hint">
        La commande ne sera marquée payée qu’après vérification par un
        administrateur.
      </p>
    </div>
  );
}
