"use client";

import ActionForm from "@/components/admin/ActionForm";
import Field from "@/components/admin/Field";
import { signIn } from "../actions";

export default function LoginForm() {
  return (
    <ActionForm action={signIn} submit="Sign in" className="admin-form">
      <Field label="Email" name="email" type="email" required />
      <Field label="Password" name="password" type="password" required />
    </ActionForm>
  );
}
