from runtime import Args
from typings.PromptTemplate.PromptTemplate import Input, Output, MessagesMessagesItems

from langchain_core.messages import BaseMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

prompt_template = ChatPromptTemplate.from_messages([
    MessagesPlaceholder(variable_name='systems'),
    MessagesPlaceholder(variable_name='messages'),
    MessagesPlaceholder(variable_name='user_inputs'),
])


def parse_args(args: Args[Input]):
    systems = args.input.systems
    if not systems:
        systems = []
    if args.input.system:
        systems.append(args.input.system)
    if systems:
        systems = [('system', '\n'.join(systems))]

    messages = args.input.messages
    if not messages:
        messages = []
    messages = [
        (message.role, message.content)
        for message in messages
        if message.role in ('user', 'human', 'ai', 'assistant')
    ]

    user_inputs = args.input.user_inputs
    if not user_inputs:
        user_inputs = []
    if args.input.user_input:
        user_inputs.append(args.input.user_input)
    if user_inputs:
        user_inputs = [('user', '\n'.join(user_inputs))]

    return systems, messages, user_inputs


def message_to_dict(msg: BaseMessage) -> MessagesMessagesItems:
    return {
        'id': msg.id if msg.id else '',
        'name': msg.name if msg.name else '',
        'role': msg.type,
        'content': msg.content if msg.content and type(msg.content) is str else '',
    }


def handler(args: Args[Input])->Output:
    systems, messages, user_inputs = parse_args(args)
    new_messages = prompt_template.invoke({
        'systems': systems,
        'messages': messages,
        'user_inputs': user_inputs,
    }).to_messages()
    new_messages = [message_to_dict(msg) for msg in new_messages]
    args.logger.debug(new_messages)
    return {'messages': new_messages}